import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/voluntario-list/voluntario-list'),
  },
] as Routes;
