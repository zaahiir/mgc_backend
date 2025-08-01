import { Routes } from '@angular/router';

export const aboutRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'about'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./about.component').then(m => m.AboutComponent),
        data: {
          title: 'About'
        },
      },
    ]
  }
];
