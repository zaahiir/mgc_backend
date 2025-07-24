import { Routes } from '@angular/router';

export const scoreBoardRoutes: Routes = [
  {
    path: '',
    data: {
      title: 'ScoreBoard'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./list-scoreboard/list-scoreboard.component').then(m => m.ListScoreboardComponent),
        data: {
          title: 'List ScoreBoards'
        },
      },
      {
        path: 'add',
        loadComponent: () => import('./create-scoreboard/create-scoreboard.component').then(m => m.CreateScoreboardComponent),
        data: {
          title: 'New ScoreBoard'
        },
      },
      {
        path: 'update',
        loadComponent: () => import('./update-scoreboard/update-scoreboard.component').then(m => m.UpdateScoreboardComponent),
        data: {
          title: 'Update ScoreBoards'
        },
      }
    ]
  }
];
