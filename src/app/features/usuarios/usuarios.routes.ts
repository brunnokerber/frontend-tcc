import { Routes } from '@angular/router';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/usuario-list/usuario-list'),
  },
];

export default USUARIOS_ROUTES;
