import { Routes } from '@angular/router';

export const tournamentRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Tournament'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-tournament/list-tournament.component').then(m => m.ListTournamentComponent),
        data: {
          title: 'List Tournaments'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-tournament/create-tournament.component').then(m => m.CreateTournamentComponent),
        data: {
          title: 'New Tournament'
        },
      },
      {
        path: 'update',
        loadComponent: () => import('./update-tournament/update-tournament.component').then(m => m.UpdateTournamentComponent),
        data: {
          title: 'Update Tournaments'
        },
      }
    ]
  }
];
