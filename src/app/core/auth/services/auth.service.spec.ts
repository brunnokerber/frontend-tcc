import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRole, LoginRequest, LoginResponse } from '../models/login.model';
import { AppAuthError, AuthService } from './auth.service';

describe('AuthService (Sessão, Tokens JWT e Controle de Permissões)', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let toastMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  const tick = () => new Promise((resolve) => setTimeout(resolve, 15));

  function setupMockSession(
    role: AppRole = 'admin',
    userId = 'user-123',
    expiresIn = 3600,
    expiresAt?: number,
  ) {
    const payload = {
      sub: userId,
      email: `${role}@ong.org`,
      app_metadata: { role },
    };
    const base64Payload = btoa(JSON.stringify(payload));
    const fakeJwt = `header.${base64Payload}.signature`;
    const expParam = expiresAt ? `&expires_at=${expiresAt}` : `&expires_in=${expiresIn}`;
    window.location.hash = `#access_token=${fakeJwt}&refresh_token=refresh123&type=login${expParam}`;
    service.captureSessionFromUrlHash();
  }

  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';

    routerMock = {
      navigate: vi.fn(),
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    window.location.hash = '';
  });

  describe('Estado inicial e Signals reativos', () => {
    it('deve iniciar desautenticado quando localStorage estiver vazio', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isAdmin()).toBe(false);
      expect(service.getUserId()).toBeNull();
      expect(service.getUser()).toBeNull();
      expect(service.getRole()).toBeNull();
      expect(service.mustSetPassword()).toBe(false);
      expect(service.getUserSignal()()).toBeNull();
      expect(service.supabaseClient).toBeDefined();
    });

    it('setMustSetPassword deve persistir valor no localStorage e atualizar o signal', () => {
      service.setMustSetPassword(true);
      expect(service.mustSetPassword()).toBe(true);
      expect(localStorage.getItem('app_must_set_password')).toBe('true');

      service.setMustSetPassword(false);
      expect(service.mustSetPassword()).toBe(false);
      expect(localStorage.getItem('app_must_set_password')).toBeNull();
    });
  });

  describe('Role e Permissões (RBAC)', () => {
    it('deve identificar perfil de Administrador corretamente', () => {
      setupMockSession('admin', 'admin-123');

      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdmin()).toBe(true);
      expect(service.getRole()).toBe('admin');
      expect(service.getUserId()).toBe('admin-123');
    });

    it('deve identificar perfil de Operador e não conceder privilégios de Admin', () => {
      setupMockSession('operador', 'operador-456');

      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdmin()).toBe(false);
      expect(service.getRole()).toBe('operador');
      expect(service.getUserId()).toBe('operador-456');
    });
  });

  describe('logout', () => {
    it('deve limpar dados da sessão, localStorage e redirecionar para login', () => {
      setupMockSession('operador');
      service.setMustSetPassword(true);

      service.logout('user');

      expect(localStorage.getItem('currentUser')).toBeNull();
      expect(localStorage.getItem('app_must_set_password')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('deve alertar sobre inatividade quando acionado por timeout em sessão ativa', () => {
      setupMockSession('operador');

      service.logout('inactivity');

      expect(toastMock.info).toHaveBeenCalledWith(
        'Sua sessão expirou por inatividade. Por favor, faça login novamente.',
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('captureSessionFromUrlHash', () => {
    it('deve retornar hasSession: false se o fragmento de hash não contiver access_token', () => {
      window.location.hash = '';
      const result = service.captureSessionFromUrlHash();
      expect(result.hasSession).toBe(false);
    });

    it('deve extrair tokens do hash e ativar trava de primeiro acesso quando for convite (type=invite)', () => {
      const payload = {
        sub: 'user-invited-789',
        email: 'novo@ong.org',
        app_metadata: { role: 'operador' },
      };
      const base64Payload = btoa(JSON.stringify(payload));
      const fakeJwt = `header.${base64Payload}.signature`;

      window.location.hash = `#access_token=${fakeJwt}&refresh_token=refresh123&type=invite&expires_in=3600`;

      const result = service.captureSessionFromUrlHash();

      expect(result.hasSession).toBe(true);
      expect(result.type).toBe('invite');
      expect(service.mustSetPassword()).toBe(true);
      expect(service.getUserId()).toBe('user-invited-789');
    });

    it('deve tratar erro de JSON mal formatado no hash sem quebrar a aplicação', () => {
      window.location.hash = `#access_token=header.invalid-base64.signature`;
      const result = service.captureSessionFromUrlHash();
      expect(result.hasSession).toBe(false);
    });
  });

  describe('login', () => {
    const loginReq: LoginRequest = { email: 'teste@ong.org', password: 'Password123!' };
    const mockTokenResp: LoginResponse = {
      access_token: 'fake-token-123',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'fake-refresh-123',
      user: {
        id: 'user-999',
        email: 'teste@ong.org',
        app_metadata: { role: 'user' },
        user_metadata: {},
      },
    };

    it('deve realizar login com sucesso e consultar o perfil do usuário na tabela profiles', () => {
      let result: LoginResponse | undefined;
      service.login(loginReq).subscribe((resp) => {
        result = resp;
      });

      const tokenReq = httpTesting.expectOne((req) => req.url.includes('/auth/v1/token'));
      expect(tokenReq.request.method).toBe('POST');
      tokenReq.flush(mockTokenResp);

      const profileReq = httpTesting.expectOne((req) => req.url.includes('/rest/v1/profiles'));
      expect(profileReq.request.method).toBe('GET');
      expect(profileReq.request.params.get('id')).toBe('eq.user-999');
      profileReq.flush([{ role: 'admin' }]);

      expect(result).toBeDefined();
      expect(result?.user?.role).toBe('admin');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdmin()).toBe(true);
    });

    it('deve aplicar fallback de role caso a consulta da tabela profiles falhe', () => {
      let result: LoginResponse | undefined;
      service.login(loginReq).subscribe((resp) => {
        result = resp;
      });

      const tokenReq = httpTesting.expectOne((req) => req.url.includes('/auth/v1/token'));
      tokenReq.flush(mockTokenResp);

      const profileReq = httpTesting.expectOne((req) => req.url.includes('/rest/v1/profiles'));
      profileReq.error(new ProgressEvent('Network error'));

      expect(result).toBeDefined();
      expect(result?.user?.role).toBe('user');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('deve realizar login sem consultar profiles caso a resposta não traga userId ou access_token', () => {
      let result: LoginResponse | undefined;
      const incompleteResp: LoginResponse = {
        access_token: '',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: '',
        user: { id: '', email: 'sem-id@ong.org', app_metadata: { role: 'operador' } },
      };

      service.login(loginReq).subscribe((resp) => {
        result = resp;
      });

      const tokenReq = httpTesting.expectOne((req) => req.url.includes('/auth/v1/token'));
      tokenReq.flush(incompleteResp);

      httpTesting.expectNone((req) => req.url.includes('/rest/v1/profiles'));
      expect(result?.user?.role).toBe('operador');
    });
  });

  describe('refreshToken', () => {
    it('deve lançar erro e encerrar sessão por inatividade se não houver refresh_token salvo', async () => {
      await expect(service.refreshToken().toPromise()).rejects.toThrow(
        'Refresh token não disponível.',
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('deve renovar token com sucesso e atualizar usuário autenticado', () => {
      setupMockSession('operador', 'user-refresh');

      let renewed: LoginResponse | undefined;
      service.refreshToken().subscribe((resp) => {
        renewed = resp;
      });

      const tokenReq = httpTesting.expectOne((req) => req.url.includes('/auth/v1/token'));
      expect(tokenReq.request.params.get('grant_type')).toBe('refresh_token');
      tokenReq.flush({
        access_token: 'new-token-456',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-789',
        user: { id: 'user-refresh', email: 'operador@ong.org' },
      });

      const profileReq = httpTesting.expectOne((req) => req.url.includes('/rest/v1/profiles'));
      profileReq.flush([{ role: 'operador' }]);

      expect(renewed).toBeDefined();
      expect(renewed?.access_token).toBe('new-token-456');
    });

    it('deve chamar logout ao receber erro na renovação de token', () => {
      setupMockSession('operador');

      let hasError = false;
      service.refreshToken().subscribe({
        error: () => {
          hasError = true;
        },
      });

      const tokenReq = httpTesting.expectOne((req) => req.url.includes('/auth/v1/token'));
      tokenReq.flush({ message: 'Token invalid' }, { status: 401, statusText: 'Unauthorized' });

      expect(hasError).toBe(true);
      expect(toastMock.info).toHaveBeenCalledWith(
        'Sua sessão expirou por inatividade. Por favor, faça login novamente.',
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getValidToken e ensureValidSession', () => {
    it('deve retornar null se não houver usuário na sessão', async () => {
      const token = await service.getValidToken();
      expect(token).toBeNull();
      const valid = await service.ensureValidSession();
      expect(valid).toBe(false);
    });

    it('deve retornar o access_token diretamente se a data de expiração for futura', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 1200;
      setupMockSession('admin', 'user-future', 1200, futureTimestamp);

      const token = await service.getValidToken();
      expect(token).toContain('header.');
      const valid = await service.ensureValidSession();
      expect(valid).toBe(true);
    });

    it('deve acionar refreshToken e compartilhar a mesma promise em chamadas concorrentes quando o token estiver expirado', async () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 100;
      setupMockSession('admin', 'user-exp', 10, pastTimestamp);

      const p1 = service.getValidToken();
      const p2 = service.getValidToken();

      const tokenReq = httpTesting.expectOne((req) => req.url.includes('/auth/v1/token'));
      tokenReq.flush({
        access_token: 'concurrent-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'new-ref',
        user: { id: 'user-exp', email: 'admin@ong.org' },
      });

      const profileReq = httpTesting.expectOne((req) => req.url.includes('/rest/v1/profiles'));
      profileReq.flush([{ role: 'admin' }]);

      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1).toBe('concurrent-token');
      expect(res2).toBe('concurrent-token');
    });
  });

  describe('inviteUser', () => {
    it('deve lançar erro se não houver token válido disponível', async () => {
      await expect(service.inviteUser('novo@ong.org', 'operador')).rejects.toThrow(
        'Sessão inválida ou expirada. Faça login novamente.',
      );
    });

    it('deve chamar a Edge Function invite-user e retornar sucesso', async () => {
      setupMockSession('admin');

      const promise = service.inviteUser('novo@ong.org', 'operador');
      await tick();

      const req = httpTesting.expectOne((r) => r.url.includes('/functions/v1/invite-user'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'novo@ong.org',
        role: 'operador',
        redirectTo: `${window.location.origin}/definir-senha`,
      });
      req.flush({ success: true, message: 'Convite enviado' });

      const resp = await promise;
      expect(resp.success).toBe(true);
    });

    it('deve propagar erro amigável ao falhar a Edge Function de convite', async () => {
      setupMockSession('admin');

      const promise = service.inviteUser('duplicado@ong.org');
      await tick();

      const req = httpTesting.expectOne((r) => r.url.includes('/functions/v1/invite-user'));
      req.flush(
        { message: 'E-mail já cadastrado.', code: 'EMAIL_EXISTS' },
        { status: 400, statusText: 'Bad Request' },
      );

      await expect(promise).rejects.toThrow('E-mail já cadastrado.');
    });
  });

  describe('sendResetPassword', () => {
    it('deve lançar erro se a sessão for inválida', async () => {
      await expect(service.sendResetPassword('reset@ong.org')).rejects.toThrow(
        'Sessão inválida ou expirada. Faça login novamente.',
      );
    });

    it('deve acionar Edge Function admin-reset-password com sucesso', async () => {
      setupMockSession('admin');

      const promise = service.sendResetPassword('reset@ong.org');
      await tick();

      const req = httpTesting.expectOne((r) =>
        r.url.includes('/functions/v1/admin-reset-password'),
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.email).toBe('reset@ong.org');
      req.flush({ success: true });

      const resp = await promise;
      expect(resp.success).toBe(true);
    });
  });

  describe('requestPasswordReset (público)', () => {
    it('deve enviar requisição de recuperação para /auth/v1/recover com sucesso', async () => {
      const promise = service.requestPasswordReset('usuario@ong.org');

      const req = httpTesting.expectOne((r) => r.url.includes('/auth/v1/recover'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'usuario@ong.org' });
      req.flush({});

      const resp = await promise;
      expect(resp.success).toBe(true);
    });

    it('deve tratar e propagar mensagem de erro em caso de falha na recuperação', async () => {
      const promise = service.requestPasswordReset('usuario@ong.org');

      const req = httpTesting.expectOne((r) => r.url.includes('/auth/v1/recover'));
      req.flush(
        { msg: 'Limite de solicitações atingido.' },
        { status: 429, statusText: 'Too Many Requests' },
      );

      await expect(promise).rejects.toThrow('Limite de solicitações atingido.');
    });
  });

  describe('updatePassword', () => {
    it('deve lançar erro se não houver usuário logado ou token válido', async () => {
      await expect(service.updatePassword('NovaSenha@123')).rejects.toThrow(
        'Sessão expirada. Por favor, acesse o link de convite novamente ou efetue login.',
      );
    });

    it('deve atualizar senha com sucesso e limpar trava mustSetPassword', async () => {
      setupMockSession('operador');
      service.setMustSetPassword(true);

      const promise = service.updatePassword('NovaSenha@123');
      await tick();

      const req = httpTesting.expectOne((r) => r.url.includes('/auth/v1/user'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ password: 'NovaSenha@123' });
      req.flush({});

      const res = await promise;
      expect(res).toBe(true);
      expect(service.mustSetPassword()).toBe(false);
    });

    it('deve mapear erro HTTP 422 same_password com mensagem e código apropriados', async () => {
      setupMockSession('operador');

      const promise = service.updatePassword('MesmaSenha@123');
      await tick();

      const req = httpTesting.expectOne((r) => r.url.includes('/auth/v1/user'));
      req.flush(
        {
          error_code: 'same_password',
          msg: 'New password should be different from the old password',
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      try {
        await promise;
        expect.unreachable();
      } catch (err: unknown) {
        const authErr = err as AppAuthError;
        expect(authErr.message).toBe('A nova senha deve ser diferente da senha anterior.');
        expect(authErr.code).toBe('same_password');
      }
    });

    it('deve mapear erro HTTP 422 weak_password informando requisitos de complexidade', async () => {
      setupMockSession('operador');

      const promise = service.updatePassword('123');
      await tick();

      const req = httpTesting.expectOne((r) => r.url.includes('/auth/v1/user'));
      req.flush(
        { error_code: 'weak_password', msg: 'Password should contain special characters' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      try {
        await promise;
        expect.unreachable();
      } catch (err: unknown) {
        const authErr = err as AppAuthError;
        expect(authErr.message).toContain(
          'A senha informada não atende aos requisitos de segurança',
        );
        expect(authErr.code).toBe('weak_password');
      }
    });

    it('deve mapear erro HTTP 403 reauthentication_needed com flag requiresReauth', async () => {
      setupMockSession('operador');

      const promise = service.updatePassword('NovaSenhaForte@123');
      await tick();

      const req = httpTesting.expectOne((r) => r.url.includes('/auth/v1/user'));
      req.flush(
        { error_code: 'reauthentication_needed', msg: 'User must reauthenticate' },
        { status: 403, statusText: 'Forbidden' },
      );

      try {
        await promise;
        expect.unreachable();
      } catch (err: unknown) {
        const authErr = err as AppAuthError;
        expect(authErr.message).toContain('esta operação exige autenticação recente');
        expect(authErr.requiresReauth).toBe(true);
      }
    });

    it('deve repassar mensagem de erro genérica em caso de falha desconhecida', async () => {
      setupMockSession('operador');

      const promise = service.updatePassword('NovaSenhaForte@123');
      await tick();

      const req = httpTesting.expectOne((r) => r.url.includes('/auth/v1/user'));
      req.flush(
        { message: 'Erro desconhecido do servidor' },
        { status: 500, statusText: 'Server Error' },
      );

      await expect(promise).rejects.toThrow('Erro desconhecido do servidor');
    });
  });
});
