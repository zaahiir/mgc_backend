import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectResolver implements Resolve<boolean> {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(): boolean {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
      return false;
    }
    return true;
  }
}
