import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminGuard } from './admin.guard';

describe('adminGuard (Controle de Acesso Administrativo - RBAC)', () => {
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let authServiceMock: {
    ensureValidSession: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
  };
  let toastMock: { warning: ReturnType<typeof vi.fn> };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/usuarios' } as RouterStateSnapshot;

  beforeEach(() => {
    routerMock = {
      navigate: vi.fn(),
    };
    authServiceMock = {
      ensureValidSession: vi.fn().mockResolvedValue(true),
      isAdmin: vi.fn().mockReturnValue(true),
    };
    toastMock = {
      warning: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
  });

  it('deve redirecionar para /login se a sessão não for válida', async () => {
    authServiceMock.ensureValidSession.mockResolvedValue(false);

    const result = await TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('deve exibir aviso toast e redirecionar para /pets se o usuário não for administrador', async () => {
    authServiceMock.isAdmin.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));

    expect(result).toBe(false);
    expect(toastMock.warning).toHaveBeenCalledWith('Acesso restrito a administradores.');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/pets']);
  });

  it('deve autorizar o acesso quando a sessão for válida e o perfil for admin', async () => {
    const result = await TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(toastMock.warning).not.toHaveBeenCalled();
  });
});
