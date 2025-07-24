import { Routes } from '@angular/router';

export const planRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Plan'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-plan/list-plan.component').then(m => m.ListPlanComponent),
        data: {
          title: 'List Plans'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-plan/create-plan.component').then(m => m.CreatePlanComponent),
        data: {
          title: 'New Plan'
        },
      },
      {
        path: 'update/:id',
        loadComponent: () => import('./update-plan/update-plan.component').then(m => m.UpdatePlanComponent),
        data: {
          title: 'Update Plans'
        },
      }
    ]
  }
];
