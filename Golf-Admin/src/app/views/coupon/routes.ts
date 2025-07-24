import { Routes } from '@angular/router';

export const couponRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Coupon'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-coupon/list-coupon.component').then(m => m.ListCouponComponent),
        data: {
          title: 'List Coupons'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-coupon/create-coupon.component').then(m => m.CreateCouponComponent),
        data: {
          title: 'New Coupon'
        },
      },
      {
        path: 'update',
        loadComponent: () => import('./update-coupon/update-coupon.component').then(m => m.UpdateCouponComponent),
        data: {
          title: 'Update Coupons'
        },
      }
    ]
  }
];
