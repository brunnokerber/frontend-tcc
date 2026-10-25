import { Routes } from '@angular/router';

export const DOACOES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/doacao-list/doacao-list'),
  },
];

export default DOACOES_ROUTES;
