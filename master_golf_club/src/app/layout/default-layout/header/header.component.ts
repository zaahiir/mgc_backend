// header.component.ts
import { Component, OnInit, Inject, PLATFORM_ID, HostListener, ElementRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../auth/auth.service';
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    this.isLoggedIn = this.authService.isLoggedIn();

    // Only run DOM manipulation code in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDOMEvents();
    }
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

    if (userDropdown && !userDropdown.contains(target)) {
      this.isUserDropdownOpen = false;
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
