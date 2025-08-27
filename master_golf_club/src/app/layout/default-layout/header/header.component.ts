// header.component.ts
import { Component, OnInit, Inject, PLATFORM_ID, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../auth/auth.service';
import { CollectionService } from '../../../main/common-service/collection/collection.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  isUserDropdownOpen: boolean = false;
  unreadNotifications: number = 0;
  showNotificationDropdown: boolean = false;
  notifications: any[] = [];
  private routerSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private collectionService: CollectionService,
    private router: Router,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Subscribe to router events to close dropdown on navigation
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeUserDropdown();
      this.showNotificationDropdown = false;
    });
  }

  ngOnInit(): void {
    // Check if user is logged in
    this.isLoggedIn = this.authService.isLoggedIn();

    // Load notifications if logged in
    if (this.isLoggedIn) {
      this.loadNotifications(); // This now loads both notifications and count
    }

    // Only run DOM manipulation code in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDOMEvents();
    }
  }

  async loadUnreadNotificationCount() {
    try {
      const response = await this.collectionService.getUnreadNotificationCount();
      console.log('Header unread count response:', response);
      
      if (response && response.data) {
        // Check if response.data has the expected code/data structure
        if (response.data.code === 1) {
          this.unreadNotifications = response.data.data.unread_count;
        } 
        // Check if response.data is a direct number or object
        else if (typeof response.data === 'number') {
          this.unreadNotifications = response.data;
        } else if (response.data.unread_count !== undefined) {
          this.unreadNotifications = response.data.unread_count;
        } else {
          console.error('Failed to load unread count:', response);
        }
      } else {
        console.error('Invalid unread count response:', response);
      }
    } catch (error) {
      console.error('Error loading unread notification count:', error);
    }
  }

  async loadNotifications() {
    try {
      const response = await this.collectionService.getHeaderNotifications();
      console.log('Header notifications response:', response);
      
      if (response && response.data && response.data.code === 1) {
        // Only load unread notifications for header display
        this.notifications = response.data.data.notifications || [];
        this.unreadNotifications = response.data.data.unread_count || 0;
        console.log('Loaded unread notifications:', this.notifications);
      } else {
        console.error('Failed to load notifications:', response);
        this.notifications = [];
        this.unreadNotifications = 0;
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
      this.unreadNotifications = 0;
    }
  }

  async markNotificationAsRead(notificationId: number) {
    try {
      await this.collectionService.markNotificationAsRead(notificationId);
      // Reload notifications to get updated count and list
      await this.loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async handleNotificationClick(notification: any) {
    try {
      // Mark specific notification as read
      await this.collectionService.markNotificationAsRead(notification.id);
      
      // Remove from notification list immediately for better UX
      this.notifications = this.notifications.filter(n => n.id !== notification.id);
      
      // Update notification badge count
      this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
      
      // Close notification dropdown
      this.showNotificationDropdown = false;
      
      // Redirect to /orders
      this.router.navigate(['/orders']);
      
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Fallback: still navigate to orders even if marking as read fails
      this.showNotificationDropdown = false;
      this.router.navigate(['/orders']);
    }
  }

  async markAllAsRead() {
    try {
      // Mark all notifications as read
      await this.collectionService.markAllNotificationsAsRead();
      
      // Clear notification dropdown immediately for better UX
      this.notifications = [];
      
      // Reset badge count to 0
      this.unreadNotifications = 0;
      
      // Close the dropdown
      this.showNotificationDropdown = false;
      
      // Reload notifications to ensure consistency (should be empty now)
      await this.loadNotifications();
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async toggleNotificationDropdown() {
    this.showNotificationDropdown = !this.showNotificationDropdown;
    
    // Refresh notifications when opening dropdown to ensure latest data
    if (this.showNotificationDropdown && this.isLoggedIn) {
      await this.loadNotifications();
    }
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }

  onMenuItemClick(): void {
    // Close dropdown immediately when menu item is clicked
    this.closeUserDropdown();
  }

  private initializeDOMEvents(): void {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      // Bootstrap dropdowns and toggler
      const mobileToggler = document.querySelector('.mobile-nav-toggler');
      const navbarCollapse = document.querySelector('.navbar-collapse');

      if (mobileToggler && navbarCollapse) {
        mobileToggler.addEventListener('click', () => {
          navbarCollapse.classList.toggle('show');
        });
      }

      // Sticky effect on scroll
      const handleScroll = () => {
        const header = document.querySelector('.main-header');
        if (window.scrollY > 50) {
          header?.classList.add('scrolled');
        } else {
          header?.classList.remove('scrolled');
        }
      };

      window.addEventListener('scroll', handleScroll);
    }, 0);
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const userDropdown = this.elementRef.nativeElement.querySelector('.user-profile-dropdown');
    const notificationDropdown = this.elementRef.nativeElement.querySelector('.notification-dropdown');

    if (userDropdown && !userDropdown.contains(target)) {
      this.isUserDropdownOpen = false;
    }

    if (notificationDropdown && !notificationDropdown.contains(target)) {
      this.showNotificationDropdown = false;
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Navigate to login page after successful logout
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        // Even if the server request fails, we should still navigate to login page
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
