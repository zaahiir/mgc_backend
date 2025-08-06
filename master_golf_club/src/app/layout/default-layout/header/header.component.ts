// header.component.ts
import { Component, OnInit, Inject, PLATFORM_ID, HostListener, ElementRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../auth/auth.service';
import { CollectionService } from '../../../main/common-service/collection/collection.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  isLoggedIn: boolean = false;
  isUserDropdownOpen: boolean = false;
  unreadNotifications: number = 0;
  showNotificationDropdown: boolean = false;
  notifications: any[] = [];

  constructor(
    private authService: AuthService,
    private collectionService: CollectionService,
    private router: Router,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    this.isLoggedIn = this.authService.isLoggedIn();

    // Load notifications if logged in
    if (this.isLoggedIn) {
      this.loadUnreadNotificationCount();
      this.loadNotifications();
    }

    // Only run DOM manipulation code in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDOMEvents();
    }
  }

  async loadUnreadNotificationCount() {
    try {
      const response = await this.collectionService.getUnreadNotificationCount();
      if (response && response.data && response.data.code === 1) {
        this.unreadNotifications = response.data.data.unread_count;
      }
    } catch (error) {
      console.error('Error loading unread notification count:', error);
    }
  }

  async loadNotifications() {
    try {
      const response = await this.collectionService.getNotifications();
      if (response && response.data && response.data.code === 1) {
        this.notifications = response.data.data.slice(0, 5); // Show only latest 5
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async markNotificationAsRead(notificationId: number) {
    try {
      await this.collectionService.markNotificationAsRead(notificationId);
      this.loadUnreadNotificationCount();
      this.loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  handleNotificationClick(notification: any) {
    // Mark notification as read
    this.markNotificationAsRead(notification.id);
    
    // Close notification dropdown
    this.showNotificationDropdown = false;
    
    // Navigate to orders page with notification ID
    if (notification.related_booking) {
      this.router.navigate(['/orders'], { 
        queryParams: { notification: notification.id } 
      });
    } else {
      // If no related booking, just go to orders page
      this.router.navigate(['/orders']);
    }
  }

  toggleNotificationDropdown() {
    this.showNotificationDropdown = !this.showNotificationDropdown;
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

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
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
}
