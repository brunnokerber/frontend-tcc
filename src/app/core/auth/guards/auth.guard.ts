
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@core/auth/services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Se o usuário acabou de abrir um link de convite ou recuperação com tokens no hash da URL
  const hashCapture = authService.captureSessionFromUrlHash();
  if (hashCapture.hasSession && (hashCapture.type === 'invite' || hashCapture.type === 'recovery')) {
    router.navigate(['/definir-senha']);
    return false;
  }

  // Trava obrigatória de Primeiro Acesso: impede navegação no sistema até definir a senha
  if (authService.mustSetPassword()) {
    router.navigate(['/definir-senha']);
    return false;
  }

  const isValid = await authService.ensureValidSession();
  if (!isValid) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

