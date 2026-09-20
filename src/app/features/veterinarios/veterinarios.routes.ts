import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/veterinario-list/veterinario-list'),
  },
] as Routes;
