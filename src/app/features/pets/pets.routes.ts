import { Routes } from '@angular/router';

export const PETS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/pet-list/pet-list')
  },
  {
    path: 'novo',
    loadComponent: () => import('./pages/pet-form/pet-form')
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./pages/pet-form/pet-form')
  }
];

export default PETS_ROUTES;
