import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/local-list/local-list'),
  },
] as Routes;
