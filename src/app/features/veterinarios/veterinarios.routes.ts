import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/veterinario-list/veterinario-list'),
  },
  {
    path: 'novo',
    loadComponent: () => import('./pages/veterinario-form/veterinario-form'),
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./pages/veterinario-form/veterinario-form'),
  },
] as Routes;
