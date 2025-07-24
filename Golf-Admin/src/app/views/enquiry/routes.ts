import { Routes } from '@angular/router';

export const enquiryRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Enquiries'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./enquiry/enquiry.component').then(m => m.EnquiryComponent),
        data: {
          title: 'List Enquiries'
        },
      },
    ]
  }
];
