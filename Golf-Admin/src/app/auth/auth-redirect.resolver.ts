import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthRedirectResolver implements Resolve<boolean> {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(): boolean {
    // If user is authenticated as admin, redirect to dashboard
    if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminRootRedirectResolver implements Resolve<boolean> {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(): boolean {
    // Check if user is authenticated as admin
    if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
    } else {
      // Not authenticated or not admin, redirect to login
      this.router.navigate(['/login']);
    }
    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminWildcardRedirectResolver implements Resolve<boolean> {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(): boolean {
    // Always redirect unknown routes based on authentication status
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) {
      this.router.navigate(['/login']);
    } else {
      // If authenticated as admin, redirect to dashboard for unknown routes
      this.router.navigate(['/dashboard']);
    }
    return false;
  }
}
