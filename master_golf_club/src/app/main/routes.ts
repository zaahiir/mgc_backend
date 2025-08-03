import { Routes } from '@angular/router';

export const mainRoutes: Routes = [
    {
      path: 'home',
      loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
    },
    {
      path: 'collection',
      loadComponent: () => import('./collection/collection.component').then(m => m.CollectionComponent)
    },
    {
      path: 'collectionPlus',
      loadComponent: () => import('./collection-plus/collection-plus.component').then(m => m.CollectionPlusComponent)
    },
    {
      path: 'events/:id',
      loadComponent: () => import('./events/events.component').then(m => m.EventsComponent)
    },
    {
      path: 'about',
      loadComponent: () => import('./about/about.component').then(m => m.AboutComponent)
    },
    {
      path: 'news',
      loadComponent: () => import('./news/news.component').then(m => m.NewsComponent)
    },
    {
      path: 'news/:id',
      loadComponent: () => import('./news/news.component').then(m => m.NewsComponent)
    },
    {
      path: 'membersNews',
      loadComponent: () => import('./members-news/members-news.component').then(m => m.MembersNewsComponent)
    },
    {
      path: 'membersRules',
      loadComponent: () => import('./members-rules/members-rules.component').then(m => m.MembersRulesComponent)
    },
    {
      path: 'membersTeam',
      loadComponent: () => import('./members-team/members-team.component').then(m => m.MembersTeamComponent)
    },
    {
      path: 'membersEvents',
      loadComponent: () => import('./master-events/master-events.component').then(m => m.MasterEventsComponent)
    },
    {
      path: 'membersTournaments',
      loadComponent: () => import('./master-tournaments/master-tournaments.component').then(m => m.MasterTournamentsComponent)
    },
    {
      path: 'profile',
      loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent)
    },
    {
      path: 'orders',
      loadComponent: () => import('./orders/orders.component').then(m => m.OrdersComponent)
    },
    {
      path: 'membership',
      loadComponent: () => import('./membership/membership.component').then(m => m.MembershipComponent)
    },
    {
      path: 'destination',
      loadComponent: () => import('./destination/destination.component').then(m => m.DestinationComponent)
    },
    {
      path: 'teeBooking',
      loadComponent: () => import('./tee-booking/tee-booking.component').then(m => m.TeeBookingComponent)
    }
];