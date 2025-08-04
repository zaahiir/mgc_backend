import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { 
  DropdownModule, 
  SidebarModule, 
  GridModule, 
  CardModule, 
  FormModule, 
  ButtonModule 
} from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { routes } from './app.routes';
import { adminAuthInterceptor } from './auth/admin-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(
      SidebarModule,
      DropdownModule,
      GridModule,
      CardModule,
      FormModule,
      ButtonModule
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([adminAuthInterceptor])
    ),
    IconSetService,
    provideAnimations()
  ]
};
