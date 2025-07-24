import { Routes } from '@angular/router';

export const coursesRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Courses'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-courses/list-courses.component').then(m => m.ListCoursesComponent),
        data: {
          title: 'List Courses'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-courses/create-courses.component').then(m => m.CreateCoursesComponent),
        data: {
          title: 'New Courses'
        },
      },
      {
        path: 'update/:id',
        loadComponent: () => import('./update-courses/update-courses.component').then(m => m.UpdateCoursesComponent),
        data: {
          title: 'Update Coursess'
        },
      }
    ]
  }
];
