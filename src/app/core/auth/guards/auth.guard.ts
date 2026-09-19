
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@core/auth/services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const isValid = await authService.ensureValidSession();
  if (!isValid) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

