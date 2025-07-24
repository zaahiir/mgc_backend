import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { LogoutComponent } from './auth/logout/logout.component';
import { DefaultLayoutComponent } from './layout/default-layout/default-layout.component';
import { AuthGuard } from './auth/auth.guard';
import { AuthRedirectResolver } from './auth/auth-redirect.resolver';
import { RootRedirectResolver } from './auth/RootRedirectResolver';

export const routes: Routes = [
  // Root Redirect
  {
    path: '',
    resolve: {
      rootRedirect: RootRedirectResolver
    },
    component: DefaultLayoutComponent
  },

  // Member Routes
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'logout',
    component: LogoutComponent
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./main/routes').then(m => m.mainRoutes)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },

  // Member Catch-All Route (Unauthenticated)
  {
    path: '**',
    component: DefaultLayoutComponent,
    resolve: {
      authRedirect: AuthRedirectResolver
    }
  }
];
