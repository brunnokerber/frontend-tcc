import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/guards/admin.guard';
import { authGuard } from './core/auth/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout';

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
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'pets',
        loadChildren: () => import('./features/pets/pets.routes'),
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
