import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import {
  AvatarComponent,
  BadgeComponent,
  BreadcrumbRouterComponent,
  ColorModeService,
  ContainerComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  NavItemComponent,
  NavLinkDirective,
  ProgressBarDirective,
  ProgressComponent,
  SidebarToggleDirective,
  TextColorDirective,
  ThemeDirective
} from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';
import { AuthService } from '../../../auth/auth.service'; // Update path as needed

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  standalone: true,
  imports: [ContainerComponent, HeaderTogglerDirective, SidebarToggleDirective, IconDirective, HeaderNavComponent, NavItemComponent, NavLinkDirective, RouterLink, RouterLinkActive, NgTemplateOutlet, BreadcrumbRouterComponent, ThemeDirective, DropdownComponent, DropdownToggleDirective, TextColorDirective, AvatarComponent, DropdownMenuDirective, DropdownHeaderDirective, DropdownItemDirective, BadgeComponent, DropdownDividerDirective, ProgressBarDirective, ProgressComponent, NgStyle]
})
export class DefaultHeaderComponent extends HeaderComponent {

  constructor(private authService: AuthService) {
    super();
  }

  sidebarId = input('sidebar1');

  // Handle logout click - ENHANCED VERSION
  onLogout(): void {
    // Show confirmation dialog (optional)
    if (confirm('Are you sure you want to logout?')) {
      // Disable the logout button to prevent multiple clicks
      const logoutButton = document.querySelector('[data-logout-btn]') as HTMLElement;
      if (logoutButton) {
        logoutButton.style.pointerEvents = 'none';
        logoutButton.style.opacity = '0.6';
      }

      // Clear any timers or intervals that might be running
      this.clearApplicationState();

      // Perform logout
      this.authService.performLogout();
    }
  }

  // Clear any application-specific state
  private clearApplicationState(): void {
    // Clear any running timers, intervals, or subscriptions
    // This prevents the application from maintaining state after logout

    // Example: Clear any cached data in services
    // this.dataService.clearCache();

    // Clear any component-specific subscriptions if needed
    // (This should be handled by the components themselves in ngOnDestroy)
  }
}
