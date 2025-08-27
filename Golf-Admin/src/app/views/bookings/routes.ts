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
      }
    ]
  }
];
