import { Routes } from '@angular/router';

export const teeRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Tee'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-tee/list-tee.component').then(m => m.ListTeeComponent),
        data: {
          title: 'List Tees'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-tee/create-tee.component').then(m => m.CreateTeeComponent),
        data: {
          title: 'New Tee'
        },
      },
      {
        path: 'update',
        loadComponent: () => import('./update-tee/update-tee.component').then(m => m.UpdateTeeComponent),
        data: {
          title: 'Update Tee'
        },
      }
    ]
  }
];
