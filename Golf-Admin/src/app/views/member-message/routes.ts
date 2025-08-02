import { Routes } from '@angular/router';

export const memberMessageRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Member Messages'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./member-message/member-message.component').then(m => m.MemberMessageComponent),
        data: {
          title: 'List Member Messages'
        },
      },
    ]
  }
]; 