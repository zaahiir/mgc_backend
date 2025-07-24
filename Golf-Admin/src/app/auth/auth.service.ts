import { Injectable, PLATFORM_ID, Inject, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, interval, Subscription } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

export interface LoginResponse {
  access: string;
  refresh: string;
  user_type: string;
  user_id: number;
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // private apiUrl = 'https://mastergolfclub.com/apis/';
  private apiUrl = 'http://localhost/apis/';
  private isBrowser: boolean;

  // Authentication state
  private authenticationState = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.authenticationState.asObservable();

  // Auto-logout timer variables
  private autoLogoutTimer: any = null;
  private sessionCheckTimer: Subscription | null = null;
  private readonly SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  // private readonly SESSION_DURATION = 3 * 60 * 1000;
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute

  constructor(
    private http: HttpClient,
    private router: Router,
    private injector: Injector
  ) {
    const platformId = this.injector.get(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);

    // Initialize authentication state
    this.initializeAuthState();

    // Start session monitoring if user is already logged in
    if (this.isAuthenticated()) {
      this.startSessionMonitoring();
    }
  }

  private initializeAuthState(): void {
    const token = this.getStorageItem('access_token');
    const userType = this.getUserType();
    const isAuth = !!token && userType === 'superuser';
    this.authenticationState.next(isAuth);
  }

  // Admin login (superuser only)
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}login/`, { username, password })
      .pipe(
        tap((response: LoginResponse) => {
          // Store tokens and user information
          this.setStorageItem('access_token', response.access);
          this.setStorageItem('refresh_token', response.refresh);
          this.setStorageItem('user_type', response.user_type);
          this.setStorageItem('user_id', response.user_id.toString());
          this.setStorageItem('username', response.username);
          this.setStorageItem('email', response.email);

          // Store login timestamp for session tracking
          this.setStorageItem('login_timestamp', Date.now().toString());

          // Update authentication state
          this.authenticationState.next(true);

          // Start auto-logout timer and session monitoring
          this.startAutoLogoutTimer();
          this.startSessionMonitoring();
        }),
        catchError((error) => this.handleError(error))
      );
  }

  // Start auto-logout timer (1 hour)
  private startAutoLogoutTimer(): void {
    this.clearAutoLogoutTimer();

    if (this.isBrowser) {
      this.autoLogoutTimer = setTimeout(() => {
        console.log('Session expired - auto logout');
        this.performAutoLogout();
      }, this.SESSION_DURATION);
    }
  }

  // Start session monitoring to check for expired sessions
  private startSessionMonitoring(): void {
    this.stopSessionMonitoring();

    if (this.isBrowser) {
      this.sessionCheckTimer = interval(this.CHECK_INTERVAL).subscribe(() => {
        this.checkSessionExpiry();
      });
    }
  }

  // Check if current session has expired
  private checkSessionExpiry(): void {
    const loginTimestamp = this.getStorageItem('login_timestamp');

    if (!loginTimestamp) {
      this.performAutoLogout();
      return;
    }

    const loginTime = parseInt(loginTimestamp, 10);
    const currentTime = Date.now();
    const sessionAge = currentTime - loginTime;

    if (sessionAge >= this.SESSION_DURATION) {
      console.log('Session expired during periodic check');
      this.performAutoLogout();
    }
  }

  // Perform automatic logout due to session expiry
  private performAutoLogout(): void {
    console.log('Performing auto-logout due to session expiry');

    // Show user notification about session expiry
    if (this.isBrowser) {
      alert('Your session has expired. You will be redirected to the login page.');
    }

    // Perform complete logout
    this.performCompleteLogout();
  }

  // Clear auto-logout timer
  private clearAutoLogoutTimer(): void {
    if (this.autoLogoutTimer) {
      clearTimeout(this.autoLogoutTimer);
      this.autoLogoutTimer = null;
    }
  }

  // Stop session monitoring
  private stopSessionMonitoring(): void {
    if (this.sessionCheckTimer) {
      this.sessionCheckTimer.unsubscribe();
      this.sessionCheckTimer = null;
    }
  }

  // Get remaining session time in minutes
  getRemainingSessionTime(): number {
    const loginTimestamp = this.getStorageItem('login_timestamp');

    if (!loginTimestamp) {
      return 0;
    }

    const loginTime = parseInt(loginTimestamp, 10);
    const currentTime = Date.now();
    const sessionAge = currentTime - loginTime;
    const remainingTime = this.SESSION_DURATION - sessionAge;

    return Math.max(0, Math.floor(remainingTime / (60 * 1000))); // Return in minutes
  }

  // Reset session timer (call this on user activity)
  resetSessionTimer(): void {
    if (this.isAuthenticated() && this.getUserType() === 'superuser') {
      this.setStorageItem('login_timestamp', Date.now().toString());
      this.startAutoLogoutTimer();
    }
  }

  // Admin logout
  logout(): Observable<any> {
    const refreshToken = this.getStorageItem('refresh_token');

    if (!refreshToken) {
      this.performCompleteLogout();
      return throwError(() => new Error('No refresh token available'));
    }

    const logoutRequest = this.http.post(`${this.apiUrl}logout/`,
      { refresh_token: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return logoutRequest.pipe(
      tap(() => {
        this.performCompleteLogout();
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Logout API error:', error);
        this.performCompleteLogout();
        return throwError(() => error);
      })
    );
  }

  // Complete logout process for admin
  performLogout(): void {
    const refreshToken = this.getStorageItem('refresh_token');

    if (refreshToken) {
      this.logout().subscribe({
        next: (response) => {
          console.log('Admin logout successful');
        },
        error: (error) => {
          console.error('Admin logout error:', error);
        }
      });
    } else {
      this.performCompleteLogout();
    }
  }

  // Complete logout process
  private performCompleteLogout(): void {
    // Stop all timers and monitoring
    this.clearAutoLogoutTimer();
    this.stopSessionMonitoring();

    // Clear all user data
    this.clearAllUserData();

    // Update authentication state
    this.authenticationState.next(false);

    // Clear browser history to prevent back button access
    if (this.isBrowser) {
      window.history.replaceState(null, '', '/login');

      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    }

    // Navigate to login
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // Helper method to clear all user data
  private clearAllUserData(): void {
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this.removeStorageItem('user_type');
    this.removeStorageItem('user_id');
    this.removeStorageItem('username');
    this.removeStorageItem('email');
    this.removeStorageItem('login_timestamp'); // Clear login timestamp
    this.removeSessionItem('session_type');

    if (this.isBrowser) {
      sessionStorage.clear();
    }
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getStorageItem('refresh_token');
    return this.http.post(`${this.apiUrl}token/refresh/`, { refresh: refreshToken })
      .pipe(
        tap((response: any) => {
          this.setStorageItem('access_token', response.access);
          // Update login timestamp on token refresh
          this.setStorageItem('login_timestamp', Date.now().toString());
          this.authenticationState.next(true);
          // Restart the auto-logout timer
          this.startAutoLogoutTimer();
        }),
        catchError((error) => {
          this.performCompleteLogout();
          return this.handleError(error);
        })
      );
  }

  isAuthenticated(): boolean {
    const token = this.getStorageItem('access_token');
    const userType = this.getUserType();
    const loginTimestamp = this.getStorageItem('login_timestamp');

    // Check if token exists and user is superuser
    const hasValidToken = !!token && userType === 'superuser';

    // Check if session hasn't expired
    let sessionValid = true;
    if (loginTimestamp) {
      const loginTime = parseInt(loginTimestamp, 10);
      const currentTime = Date.now();
      const sessionAge = currentTime - loginTime;
      sessionValid = sessionAge < this.SESSION_DURATION;
    } else {
      sessionValid = false;
    }

    const isAuth = hasValidToken && sessionValid;

    // Update subject if state changed
    if (this.authenticationState.value !== isAuth) {
      this.authenticationState.next(isAuth);

      // If session expired, perform auto logout
      if (!isAuth && hasValidToken && !sessionValid) {
        this.performAutoLogout();
      }
    }

    return isAuth;
  }

  isAdmin(): boolean {
    return this.getUserType() === 'superuser';
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getUserType(): string | null {
    return this.getStorageItem('user_type');
  }

  getUserId(): number | null {
    const userId = this.getStorageItem('user_id');
    return userId ? parseInt(userId, 10) : null;
  }

  getUsername(): string | null {
    return this.getStorageItem('username');
  }

  getEmail(): string | null {
    return this.getStorageItem('email');
  }

  getAccessToken(): string | null {
    return this.getStorageItem('access_token');
  }

  getRefreshToken(): string | null {
    return this.getStorageItem('refresh_token');
  }

  forceLogout(): void {
    this.performCompleteLogout();
  }

  // Helper methods for storage
  private getStorageItem(key: string): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private setStorageItem(key: string, value: string): void {
    if (this.isBrowser) {
      localStorage.setItem(key, value);
    }
  }

  private removeStorageItem(key: string): void {
    if (this.isBrowser) {
      localStorage.removeItem(key);
    }
  }

  private removeSessionItem(key: string): void {
    if (this.isBrowser) {
      sessionStorage.removeItem(key);
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error(errorMessage);
    return throwError(() => error);
  }
}
