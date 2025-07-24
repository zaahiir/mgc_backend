// src/app/scroll.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',  // Makes the service available throughout the app
})
export class ScrollService {
  constructor(private router: Router) {
    // Subscribe to the router's NavigationEnd event to trigger scroll to top
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (typeof window !== 'undefined') {  // Check if window is available
          window.scrollTo(0, 0);  // Scroll to top of the page
        }
      });
  }
}
