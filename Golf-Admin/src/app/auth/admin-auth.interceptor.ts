import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const adminAuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);

  // Get the auth token from the service
  const authToken = authService.getAccessToken();

  // Clone the request and add the authorization header if token exists
  let authReq = req;
  if (authToken && authService.isAdmin()) {
    // Only add essential headers to avoid CORS issues
    authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Send the request and handle errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If we get a 401 error, it means the token is invalid or expired
      if (error.status === 401) {
        console.error('Unauthorized access - forcing logout');
        // Force complete logout to prevent back button access
        authService.forceLogout();
      }

      // If we get a 403 error, user doesn't have admin privileges
      if (error.status === 403) {
        console.error('Forbidden - insufficient privileges');
        authService.forceLogout();
      }

      return throwError(() => error);
    })
  );
};
