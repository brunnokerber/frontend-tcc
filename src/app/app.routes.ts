import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/guards/admin.guard';
import { authGuard } from './core/auth/guards/auth.guard';
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'pets',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login'),
  },
  {
    path: 'definir-senha',
    loadComponent: () => import('./features/definir-senha/definir-senha'),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'pets',
        loadChildren: () => import('./features/pets/pets.routes'),
      },
      {
        path: 'calendario-vacinal',
        loadComponent: () =>
          import('./features/calendario-vacinal/pages/calendario-vacinal/calendario-vacinal'),
      },
      {
        path: 'veterinarios',
        loadChildren: () => import('./features/veterinarios/veterinarios.routes'),
      },
      {
        path: 'locais',
        loadChildren: () => import('./features/locais/locais.routes'),
      },
      {
        path: 'doacoes',
        loadChildren: () => import('./features/doacoes/doacoes.routes'),
      },
      {
        path: 'voluntarios',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/voluntarios/voluntarios.routes'),
      },
      {
        path: 'financeiro',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/financeiro/financeiro.routes').then((m) => m.FINANCEIRO_ROUTES),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/usuarios/usuarios.routes'),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'pets',
  },
];
