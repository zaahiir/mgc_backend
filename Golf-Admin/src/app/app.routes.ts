import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DefaultLayoutComponent } from './layout';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: 'Home'
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./views/dashboard/routes').then((m) => m.dashboardRoutes)
      },
      {
        path: 'about',
        loadChildren: () => import('./views/about/routes').then((m) => m.aboutRoutes)
      },
      {
        path: 'bookings',
        loadChildren: () => import('./views/bookings/routes').then((m) => m.bookingRoutes)
      },
      {
        path: 'members',
        loadChildren: () => import('./views/members/routes').then((m) => m.membersRoutes)
      },
      {
        path: 'plan',
        loadChildren: () => import('./views/plan/routes').then((m) => m.planRoutes)
      },
      {
        path: 'courses',
        loadChildren: () => import('./views/courses/routes').then((m) => m.coursesRoutes)
      },
      {
        path: 'events',
        loadChildren: () => import('./views/events/routes').then((m) => m.eventsRoutes)
      },
      {
        path: 'tournament',
        loadChildren: () => import('./views/tournament/routes').then((m) => m.tournamentRoutes)
      },
      {
        path: 'team',
        loadChildren: () => import('./views/team/routes').then((m) => m.teamRoutes)
      },
      {
        path: 'faq',
        loadChildren: () => import('./views/faq/routes').then((m) => m.faqRoutes)
      },
      {
        path: 'scoreBoard',
        loadChildren: () => import('./views/scoreboard/routes').then((m) => m.scoreBoardRoutes)
      },
      {
        path: 'blog',
        loadChildren: () => import('./views/blog/routes').then((m) => m.blogRoutes)
      },
      {
        path: 'concept',
        loadChildren: () => import('./views/concept/routes').then((m) => m.couponRoutes)
      },
      {
        path: 'coupon',
        loadChildren: () => import('./views/coupon/routes').then((m) => m.couponRoutes)
      },
      {
        path: 'enquiry',
        loadChildren: () => import('./views/enquiry/routes').then((m) => m.enquiryRoutes)
      },
      {
        path: 'memberEnquiry',
        loadChildren: () => import('./views/memberEnquiry/routes').then((m) => m.memberEnquiryRoutes)
      },
      {
        path: 'memberMessage',
        loadChildren: () => import('./views/member-message/routes').then((m) => m.memberMessageRoutes)
      },
      {
        path: 'amenities',
        loadChildren: () => import('./views/amenities/routes').then((m) => m.amenitiesRoutes)
      },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
