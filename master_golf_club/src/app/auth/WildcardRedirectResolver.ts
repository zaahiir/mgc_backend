import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WildcardRedirectResolver implements Resolve<boolean> {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(): boolean {
    // Always redirect to login for any unknown routes when not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    } else {
      // If authenticated, redirect to home for unknown routes
      this.router.navigate(['/home']);
    }
    return false;
  }
}
