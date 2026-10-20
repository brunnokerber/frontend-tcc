import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UserProfile } from '@core/auth/models/login.model';
import { AuthService } from '@core/auth/services/auth.service';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService (Gestão de Usuários, RBAC e Edge Functions)', () => {
  let service: UsuariosService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
      functions: {
        invoke: ReturnType<typeof vi.fn>;
      };
    };
  };
  let authServiceMock: {
    getUserId: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let toastMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const mockProfiles: UserProfile[] = [
    {
      id: 'user-1',
      email: 'admin@ong.org',
      nome: 'Administrador Chefe',
      role: 'admin',
      ativo: true,
      created_at: '2026-01-01',
    },
    {
      id: 'user-2',
      email: 'operador@ong.org',
      nome: 'Operador Voluntário',
      role: 'operador',
      ativo: false,
      created_at: '2026-02-01',
    },
  ];

  beforeEach(() => {
    supabaseMock = {
      client: {
        from: vi.fn(),
        functions: {
          invoke: vi.fn(),
        },
      },
    };

    authServiceMock = {
      getUserId: vi.fn().mockReturnValue('user-1'),
      logout: vi.fn(),
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        UsuariosService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(UsuariosService);
  });

  describe('fetchUsuarios', () => {
    it('deve listar perfis do sistema e preencher o signal usuarios', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchUsuarios();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('profiles');
      expect(result).toEqual(mockProfiles);
      expect(service.usuarios()).toEqual(mockProfiles);
      expect(service.loading()).toBe(false);
    });

    it('deve retornar array vazio e notificar erro caso a busca de perfis falhe', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Acesso negado') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchUsuarios();

      expect(result).toEqual([]);
      expect(toastMock.error).toHaveBeenCalledWith('Acesso negado');
      expect(service.loading()).toBe(false);
    });
  });

  describe('toggleStatus, deactivateUsuario e reactivateUsuario (Edge Function)', () => {
    it('deve invocar edge function toggle-user-status com sucesso para reativar', async () => {
      supabaseMock.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const success = await service.reactivateUsuario('user-2');

      expect(supabaseMock.client.functions.invoke).toHaveBeenCalledWith('toggle-user-status', {
        body: { userId: 'user-2', ativo: true },
      });
      expect(success).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Conta de usuário reativada com sucesso.');
    });

    it('deve invocar edge function toggle-user-status para desativar conta', async () => {
      supabaseMock.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const success = await service.deactivateUsuario('user-1');

      expect(supabaseMock.client.functions.invoke).toHaveBeenCalledWith('toggle-user-status', {
        body: { userId: 'user-1', ativo: false },
      });
      expect(success).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Conta de usuário desativada com sucesso.');
    });

    it('deve tratar erro HTTP retornado pela Edge Function', async () => {
      supabaseMock.client.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Edge Function retornou erro 500' },
      });

      const success = await service.toggleStatus('user-1', false);

      expect(success).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith('Edge Function retornou erro 500');
    });

    it('deve tratar corpo de resposta com erro vindo do backend', async () => {
      supabaseMock.client.functions.invoke.mockResolvedValue({
        data: { error: 'Não é possível desativar o único administrador ativo' },
        error: null,
      });

      const success = await service.toggleStatus('user-1', false);

      expect(success).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith(
        'Não é possível desativar o único administrador ativo',
      );
    });
  });

  describe('updateRole (RBAC)', () => {
    it('deve atualizar o papel do usuário para Administrador na tabela profiles', async () => {
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderUpdate)
        .mockReturnValueOnce(queryBuilderFetch);

      const success = await service.updateRole('user-2', 'admin');

      expect(success).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Perfil atualizado para "Administrador".');
    });

    it('deve atualizar o papel do usuário para Operador', async () => {
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderUpdate)
        .mockReturnValueOnce(queryBuilderFetch);

      const success = await service.updateRole('user-1', 'operador');

      expect(success).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Perfil atualizado para "Operador".');
    });

    it('deve tratar erro na atualização de role', async () => {
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Permissão negada' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderUpdate);

      const success = await service.updateRole('user-2', 'admin');

      expect(success).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith('Permissão negada');
    });
  });

  describe('deactivateSelf', () => {
    it('deve desativar a própria conta e fazer logout imediato', async () => {
      supabaseMock.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const success = await service.deactivateSelf();

      expect(success).toBe(true);
      expect(toastMock.info).toHaveBeenCalledWith(
        'Sua conta foi desativada com sucesso. Até logo!',
      );
      expect(authServiceMock.logout).toHaveBeenCalled();
    });

    it('deve falhar se o id do usuário atual não for encontrado', async () => {
      authServiceMock.getUserId.mockReturnValue(null);

      const success = await service.deactivateSelf();

      expect(success).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith('Usuário não identificado.');
    });

    it('não deve deslogar caso a chamada de desativação falhe', async () => {
      supabaseMock.client.functions.invoke.mockResolvedValue({
        data: { error: 'Erro no servidor' },
        error: null,
      });

      const success = await service.deactivateSelf();

      expect(success).toBe(false);
      expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
  });
});
