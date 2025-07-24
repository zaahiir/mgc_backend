import { Routes } from '@angular/router';

export const eventsRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Events'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-events/list-events.component').then(m => m.ListEventsComponent),
        data: {
          title: 'List Events'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-events/create-events.component').then(m => m.CreateEventsComponent),
        data: {
          title: 'New Events'
        },
      },
      {
        path: 'update',
        loadComponent: () => import('./update-events/update-events.component').then(m => m.UpdateEventsComponent),
        data: {
          title: 'Update Events'
        },
      }
    ]
  }
];
