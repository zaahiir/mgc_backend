import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Check if user is authenticated AND is an admin/superuser
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) {
      // Force complete logout to prevent back button access
      this.authService.forceLogout();
      return false;
    }
    return true;
  }
}

// Alternative guard for general authentication (less strict)
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      // Use replaceUrl to prevent back button access
      this.router.navigate(['/login'], { replaceUrl: true });
      return false;
    }
    return true;
  }
}

// NEW: Enhanced guard that checks authentication state and prevents caching
@Injectable({
  providedIn: 'root'
})
export class NoBackButtonGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Check authentication
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) {
      this.authService.forceLogout();
      return false;
    }

    // Prevent caching of protected pages
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // Clear any cached data before page unload
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
      });
    }

    return true;
  }
}
