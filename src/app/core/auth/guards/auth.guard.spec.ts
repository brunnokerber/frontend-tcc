import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authGuard } from './auth.guard';

describe('authGuard (Proteção de Rotas Autenticadas)', () => {
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let authServiceMock: {
    captureSessionFromUrlHash: ReturnType<typeof vi.fn>;
    mustSetPassword: ReturnType<typeof vi.fn>;
    ensureValidSession: ReturnType<typeof vi.fn>;
  };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/pets' } as RouterStateSnapshot;

  beforeEach(() => {
    routerMock = {
      navigate: vi.fn(),
    };
    authServiceMock = {
      captureSessionFromUrlHash: vi.fn().mockReturnValue({ hasSession: false, type: null }),
      mustSetPassword: vi.fn().mockReturnValue(false),
      ensureValidSession: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  it('deve redirecionar para /definir-senha quando houver convite ou recuperação no hash da URL', async () => {
    authServiceMock.captureSessionFromUrlHash.mockReturnValue({
      hasSession: true,
      type: 'invite',
    });

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/definir-senha']);
  });

  it('deve redirecionar para /definir-senha quando recovery estiver presente no hash da URL', async () => {
    authServiceMock.captureSessionFromUrlHash.mockReturnValue({
      hasSession: true,
      type: 'recovery',
    });

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/definir-senha']);
  });

  it('deve redirecionar para /definir-senha quando mustSetPassword for true (trava de primeiro acesso)', async () => {
    authServiceMock.mustSetPassword.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/definir-senha']);
  });

  it('deve redirecionar para /login se a sessão não for válida', async () => {
    authServiceMock.ensureValidSession.mockResolvedValue(false);

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('deve permitir acesso quando o usuário possuir sessão válida e não precisar definir senha', async () => {
    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
