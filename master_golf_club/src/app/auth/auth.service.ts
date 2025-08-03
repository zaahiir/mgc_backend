import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, Subject, timer, Subscription } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BaseAPIUrl, baseURLType } from '../main/common-service/commom-api-url';

export interface LoginResponse {
  access: string;
  refresh: string;
  user_type: string;
  user_id: number;
  username: string;
  email: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  code: number;
  message: string;
  verification_code?: string; // For development/testing purposes
}

export interface SetNewPasswordRequest {
  verification_code: string;
  new_password: string;
  confirm_password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl: string;
  private isBrowser: boolean;

  // Auto-logout related properties
  private logoutTimer: Subscription | null = null;
  private warningTimer: Subscription | null = null;
  private readonly SESSION_TIMEOUT = 60 * 60 * 1000;
  // private readonly SESSION_TIMEOUT = 3 * 60 * 1000;
  private readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout

  // Subjects for logout events
  private logoutSubject = new Subject<void>();
  private warningSubject = new Subject<number>(); // Emits remaining minutes

  // Public observables
  public logoutWarning$ = this.warningSubject.asObservable();
  public autoLogout$ = this.logoutSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Initialize API URL using the common configuration
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);

    // Start session monitoring if user is already authenticated
    if (this.isAuthenticated()) {
      this.startSessionMonitoring();
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}member_login/`, { username, password })
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

          // Start session monitoring
          this.startSessionMonitoring();
        }),
        catchError(this.handleError)
      );
  }

  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}password_reset/`, { email })
      .pipe(
        catchError(this.handleError)
      );
  }

  // New method to verify reset code and set new password
  setNewPassword(data: SetNewPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}set_new_password/`, data)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Method to verify reset code without setting password
  verifyResetCode(verification_code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}verify_reset_code/`, { verification_code })
      .pipe(
        catchError(this.handleError)
      );
  }

  logout(): Observable<any> {
    const refreshToken = this.getStorageItem('refresh_token');

    // Clear timers first
    this.clearSessionTimers();

    return this.http.post(`${this.apiUrl}member_logout/`, { refresh_token: refreshToken })
      .pipe(
        tap(() => {
          this.clearAllUserData();
          this.router.navigate(['/login']);
        }),
        catchError((error) => {
          // Even if the server request fails, clear user data
          this.clearAllUserData();
          this.router.navigate(['/login']);
          return throwError(() => error);
        })
      );
  }

  // Method to handle automatic logout
  autoLogout(): void {
    this.clearSessionTimers();
    this.clearAllUserData();
    this.logoutSubject.next();
    this.router.navigate(['/login']);

    // Optional: Show notification
    if (this.isBrowser) {
      alert('Your session has expired. Please log in again.');
    }
  }

  // Start session monitoring
  private startSessionMonitoring(): void {
    if (!this.isBrowser) return;

    this.clearSessionTimers();

    const loginTime = this.getStorageItem('login_timestamp');
    if (!loginTime) return;

    const currentTime = Date.now();
    const sessionStart = parseInt(loginTime, 10);
    const elapsedTime = currentTime - sessionStart;

    // If session already expired
    if (elapsedTime >= this.SESSION_TIMEOUT) {
      this.autoLogout();
      return;
    }

    const remainingTime = this.SESSION_TIMEOUT - elapsedTime;
    const warningTime = remainingTime - this.WARNING_TIME;

    // Set warning timer (5 minutes before logout)
    if (warningTime > 0) {
      this.warningTimer = timer(warningTime).subscribe(() => {
        this.startWarningCountdown();
      });
    } else {
      // If warning time has already passed, start countdown immediately
      this.startWarningCountdown();
    }

    // Set automatic logout timer
    this.logoutTimer = timer(remainingTime).subscribe(() => {
      this.autoLogout();
    });
  }

  // Start countdown warning
  private startWarningCountdown(): void {
    const loginTime = this.getStorageItem('login_timestamp');
    if (!loginTime) return;

    const sessionStart = parseInt(loginTime, 10);

    // Emit warnings every minute
    const warningInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - sessionStart;
      const remainingTime = this.SESSION_TIMEOUT - elapsedTime;
      const remainingMinutes = Math.ceil(remainingTime / (60 * 1000));

      if (remainingMinutes <= 5 && remainingMinutes > 0) {
        this.warningSubject.next(remainingMinutes);
      } else if (remainingMinutes <= 0) {
        clearInterval(warningInterval);
      }
    }, 60000); // Check every minute
  }

  // Clear all session timers
  private clearSessionTimers(): void {
    if (this.logoutTimer) {
      this.logoutTimer.unsubscribe();
      this.logoutTimer = null;
    }
    if (this.warningTimer) {
      this.warningTimer.unsubscribe();
      this.warningTimer = null;
    }
  }

  // Method to extend session (call this on user activity)
  extendSession(): void {
    if (!this.isAuthenticated()) return;

    // Update the login timestamp
    this.setStorageItem('login_timestamp', Date.now().toString());

    // Restart session monitoring
    this.startSessionMonitoring();
  }

  // Helper method to clear all user data
  private clearAllUserData(): void {
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this.removeStorageItem('user_type');
    this.removeStorageItem('user_id');
    this.removeStorageItem('username');
    this.removeStorageItem('email');
    this.removeStorageItem('login_timestamp');
    this.removeSessionItem('session_type');
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getStorageItem('refresh_token');
    return this.http.post(`${this.apiUrl}token/refresh/`, { refresh: refreshToken })
      .pipe(
        tap((response: any) => {
          this.setStorageItem('access_token', response.access);
          // Extend session on successful token refresh
          this.extendSession();
        }),
        catchError(this.handleError)
      );
  }

  isAuthenticated(): boolean {
    const token = this.getStorageItem('access_token');
    const loginTime = this.getStorageItem('login_timestamp');

    if (!token || !loginTime) return false;

    // Check if session has expired
    const currentTime = Date.now();
    const sessionStart = parseInt(loginTime, 10);
    const elapsedTime = currentTime - sessionStart;

    if (elapsedTime >= this.SESSION_TIMEOUT) {
      this.clearAllUserData();
      return false;
    }

    return true;
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

  // Get remaining session time in minutes
  getRemainingSessionTime(): number {
    if (!this.isAuthenticated()) return 0;

    const loginTime = this.getStorageItem('login_timestamp');
    if (!loginTime) return 0;

    const currentTime = Date.now();
    const sessionStart = parseInt(loginTime, 10);
    const elapsedTime = currentTime - sessionStart;
    const remainingTime = this.SESSION_TIMEOUT - elapsedTime;

    return Math.ceil(remainingTime / (60 * 1000));
  }

  // Helper methods to safely access storage
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
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => error);
  }

  // Cleanup method to call when service is destroyed
  ngOnDestroy(): void {
    this.clearSessionTimers();
  }
}
