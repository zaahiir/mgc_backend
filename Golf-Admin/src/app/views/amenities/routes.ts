import { Routes } from '@angular/router';

export const amenitiesRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'amenities'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-amenities/list-amenities.component').then(m => m.ListAmenitiesComponent),
        data: {
          title: 'List amenities'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-amenities/create-amenities.component').then(m => m.CreateAmenitiesComponent),
        data: {
          title: 'New amenities'
        },
      },
      {
        path: 'update/:id',
        loadComponent: () => import('./update-amenities/update-amenities.component').then(m => m.UpdateAmenitiesComponent),
        data: {
          title: 'Update amenities'
        },
      }
    ]
  }
];
