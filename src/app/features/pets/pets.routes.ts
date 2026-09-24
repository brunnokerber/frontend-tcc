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
    path: 'detalhes/:id',
    loadComponent: () => import('./pages/pet-detail/pet-detail')
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./pages/pet-form/pet-form'),
  },
  {
    path: ':petId/vacinas/nova',
    loadComponent: () => import('./pages/vacina-form/vacina-form'),
  },
  {
    path: ':petId/vacinas/:vacinaId/editar',
    loadComponent: () => import('./pages/vacina-form/vacina-form'),
  },
  {
    path: ':petId/procedimentos/novo',
    loadComponent: () => import('./pages/procedimento-form/procedimento-form'),
  },
  {
    path: ':petId/procedimentos/:procedimentoId/editar',
    loadComponent: () => import('./pages/procedimento-form/procedimento-form'),
  }
];

export default PETS_ROUTES;
