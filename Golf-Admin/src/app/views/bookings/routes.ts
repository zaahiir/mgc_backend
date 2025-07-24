import { Routes } from '@angular/router';

export const bookingRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Booking'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-booking/list-booking.component').then(m => m.ListBookingComponent),
        data: {
          title: 'List Booking'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-booking/create-booking.component').then(m => m.CreateBookingComponent),
        data: {
          title: 'New Booking'
        },
      },
      {
        path: 'update',
        loadComponent: () => import('./update-booking/update-booking.component').then(m => m.UpdateBookingComponent),
        data: {
          title: 'Update Booking'
        },
      }
    ]
  }
];
