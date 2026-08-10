import { Routes } from '@angular/router';

import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./features/login/login')
    },
    {
        path: 'hello-world',
        canActivate: [authGuard],
        loadComponent: () => import('./features/hello-world/hello-world')
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];