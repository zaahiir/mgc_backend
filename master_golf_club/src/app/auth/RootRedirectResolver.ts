import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RootRedirectResolver implements Resolve<boolean> {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(): boolean {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login']);
    }
    return true;
  }
}
