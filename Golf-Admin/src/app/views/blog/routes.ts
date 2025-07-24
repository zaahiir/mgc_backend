import { Routes } from '@angular/router';

export const blogRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'Blog'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-blog/list-blog.component').then(m => m.ListBlogComponent),
        data: {
          title: 'List Blogs'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-blog/create-blog.component').then(m => m.CreateBlogComponent),
        data: {
          title: 'New Blog'
        },
      },
      {
        path: 'update/:id',
        loadComponent: () => import('./update-blog/update-blog.component').then(m => m.UpdateBlogComponent),
        data: {
          title: 'Update Blogs'
        },
      }
    ]
  }
];
