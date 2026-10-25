import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AuditResolverService } from './audit-resolver.service';
import { AuthService } from '@core/auth/services/auth.service';
import { SupabaseService } from '@core/services/supabase';
import { UserProfile } from '@core/auth/models/login.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AuditResolverService', () => {
  let service: AuditResolverService;
  let authServiceMock: { isAdmin: ReturnType<typeof vi.fn> };
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };

  const mockProfile: UserProfile = {
    id: 'user-uuid-123',
    email: 'editor@peludinhos.org',
    role: 'admin',
    ativo: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    authServiceMock = {
      isAdmin: vi.fn().mockReturnValue(true),
    };

    supabaseMock = {
      client: {
        from: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuditResolverService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });

    service = TestBed.inject(AuditResolverService);
  });

  it('deve retornar null se o userId for nulo, indefinido ou vazio', async () => {
    expect(await service.resolveUser(null)).toBeNull();
    expect(await service.resolveUser(undefined)).toBeNull();
    expect(await service.resolveUser('   ')).toBeNull();
    expect(supabaseMock.client.from).not.toHaveBeenCalled();
  });

  it('deve retornar null se o usuário atual não for administrador', async () => {
    authServiceMock.isAdmin.mockReturnValue(false);

    const result = await service.resolveUser('user-uuid-123');

    expect(result).toBeNull();
    expect(supabaseMock.client.from).not.toHaveBeenCalled();
  });

  it('deve consultar o Supabase e retornar o perfil quando for administrador', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseMock.client.from.mockReturnValue({ select: selectMock });

    const result = await service.resolveUser('user-uuid-123');

    expect(result).toEqual(mockProfile);
    expect(supabaseMock.client.from).toHaveBeenCalledWith('profiles');
    expect(selectMock).toHaveBeenCalledWith('id, email, role, ativo, created_at');
    expect(eqMock).toHaveBeenCalledWith('id', 'user-uuid-123');
  });

  it('deve utilizar o cache em memória e não chamar o Supabase na segunda consulta', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseMock.client.from.mockReturnValue({ select: selectMock });

    const first = await service.resolveUser('user-uuid-123');
    const second = await service.resolveUser('user-uuid-123');

    expect(first).toEqual(mockProfile);
    expect(second).toEqual(mockProfile);
    expect(supabaseMock.client.from).toHaveBeenCalledTimes(1);
  });

  it('deve deduplicar requisições simultâneas para o mesmo userId', async () => {
    const maybeSingleMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: mockProfile, error: null }), 10);
        }),
    );
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseMock.client.from.mockReturnValue({ select: selectMock });

    const [res1, res2] = await Promise.all([
      service.resolveUser('user-uuid-123'),
      service.resolveUser('user-uuid-123'),
    ]);

    expect(res1).toEqual(mockProfile);
    expect(res2).toEqual(mockProfile);
    expect(supabaseMock.client.from).toHaveBeenCalledTimes(1);
  });

  it('deve retornar null quando o Supabase retornar erro ou nenhum registro', async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseMock.client.from.mockReturnValue({ select: selectMock });

    const result = await service.resolveUser('unknown-user');

    expect(result).toBeNull();
  });

  it('deve permitir limpar o cache em memória', async () => {
    service.setCachedUser(mockProfile);
    expect(await service.resolveUser(mockProfile.id)).toEqual(mockProfile);

    service.clearCache();
    expect(supabaseMock.client.from).not.toHaveBeenCalled();

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseMock.client.from.mockReturnValue({ select: selectMock });

    await service.resolveUser(mockProfile.id);
    expect(supabaseMock.client.from).toHaveBeenCalledTimes(1);
  });
});
