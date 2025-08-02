import { Routes } from '@angular/router';

export const teamRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Team'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./team.component').then(m => m.TeamComponent),
        data: {
          title: 'Team'
        },
      }
    ]
  }
];
