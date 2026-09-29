import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';

export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const toast = inject(ToastService);

  const isValid = await authService.ensureValidSession();
  if (!isValid) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isAdmin()) {
    toast.warning('Acesso restrito a administradores.');
    router.navigate(['/pets']);
    return false;
  }

  return true;
};
