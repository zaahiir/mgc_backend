import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { DropdownModule, SidebarModule } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { routes } from './app.routes';
import { AdminAuthInterceptor } from './auth/admin-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(
      SidebarModule,
      DropdownModule,
      HttpClientModule
    ),
    IconSetService,
    provideAnimations(),
    // Add the HTTP interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AdminAuthInterceptor,
      multi: true
    }
  ]
};
