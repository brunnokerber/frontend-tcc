import { Routes } from '@angular/router';

export const FINANCEIRO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/financeiro-dashboard/financeiro-dashboard'),
  },
];
