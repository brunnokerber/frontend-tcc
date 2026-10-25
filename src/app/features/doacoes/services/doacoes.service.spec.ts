import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoacoesService } from './doacoes.service';

describe('DoacoesService (Módulo de Doações e Direcionamentos)', () => {
  let service: DoacoesService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockDoacaoRaw = {
    id: 1,
    tipo_doacao: 'Ração',
    volume: 50,
    doador: 'Agropecuária Sul',
    telefone: '51999998888',
    unidade_medida: 'kg',
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-24T10:00:00Z',
    direcionamento_doacoes: [
      {
        id: 10,
        id_local: 2,
        id_doacao: 1,
        volume: 20,
        created_at: '2026-10-24T10:30:00Z',
        updated_at: '2026-10-24T10:30:00Z',
        locais: {
          id: 2,
          local: 'Lar da Maria',
          tipo_local: 'Lar Temporário',
          contato: 'Maria',
          telefone: '51988887777',
          cidade: 'Novo Hamburgo',
        },
      },
    ],
  };

  beforeEach(() => {
    supabaseMock = {
      client: {
        from: vi.fn(),
      },
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DoacoesService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(DoacoesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchDoacoes', () => {
    it('deve buscar doacoes com relacionamentos, calcular saldos e atualizar signal', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockDoacaoRaw], error: null }),
        ilike: vi.fn().mockReturnThis(),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchDoacoes();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('doacoes');
      expect(result.length).toBe(1);
      expect(result[0].volume_direcionado).toBe(20);
      expect(result[0].volume_disponivel).toBe(30);
      expect(result[0].percentual_direcionado).toBe(40);
      expect(result[0].status).toBe('parcial');
      expect(service.doacoes().length).toBe(1);
      expect(service.loading()).toBe(false);
    });

    it('deve aplicar filtros de busca por doador, telefone e unidade_medida', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [mockDoacaoRaw], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      await service.fetchDoacoes({ searchField: 'telefone', searchValue: '(51) 99999-8888' });
      expect(queryBuilder.ilike).toHaveBeenCalledWith('telefone', '%51999998888%');

      await service.fetchDoacoes({ searchField: 'unidade_medida', searchValue: 'kg' });
      expect(queryBuilder.ilike).toHaveBeenCalledWith('unidade_medida', '%kg%');

      await service.fetchDoacoes({ searchField: 'doador', searchValue: 'Agro' });
      expect(queryBuilder.ilike).toHaveBeenCalledWith('doador', '%Agro%');
    });

    it('deve tratar erro e emitir toast ao falhar query do banco', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('PostgREST error') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchDoacoes();

      expect(result).toEqual([]);
      expect(service.error()).toBe('PostgREST error');
      expect(toastMock.error).toHaveBeenCalled();
    });
  });

  describe('fetchDirecionamentos', () => {
    it('deve buscar direcionamentos consolidados com relacionamentos de local e doacao', async () => {
      const mockDirecionamento = {
        id: 10,
        id_local: 2,
        id_doacao: 1,
        volume: 20,
        created_at: '2026-10-24T10:30:00Z',
        updated_at: '2026-10-24T10:30:00Z',
        locais: { id: 2, local: 'Lar Esperança', tipo_local: 'Lar Temporário' },
        doacoes: { id: 1, doador: 'Empresa X', volume: 50, unidade_medida: 'kg' },
      };

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockDirecionamento], error: null }),
        eq: vi.fn().mockReturnThis(),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchDirecionamentos();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('direcionamento_doacoes');
      expect(result.length).toBe(1);
      expect(result[0].local?.local).toBe('Lar Esperança');
      expect(service.direcionamentos().length).toBe(1);
    });
  });

  describe('createDoacao', () => {
    it('deve cadastrar nova doacao, emitir toast e recarregar lista', async () => {
      const insertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 2,
            tipo_doacao: 'Material de Limpeza',
            volume: 100,
            doador: 'Clube Rotário',
            telefone: '51988881111',
            unidade_medida: 'un',
            created_at: '2026-10-24T10:00:00Z',
            updated_at: '2026-10-24T10:00:00Z',
          },
          error: null,
        }),
      };
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabaseMock.client.from.mockReturnValueOnce(insertBuilder).mockReturnValueOnce(fetchBuilder);

      const res = await service.createDoacao({
        tipo_doacao: 'Material de Limpeza',
        volume: 100,
        doador: 'Clube Rotário',
        telefone: '(51) 98888-1111',
        unidade_medida: 'un',
      });

      expect(res?.id).toBe(2);
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe('updateDoacao', () => {
    it('deve impedir diminuir o volume para valor menor que o volume já direcionado', async () => {
      // Configurar doação existente com volume 50 e 20 direcionados
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockDoacaoRaw], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      await service.fetchDoacoes();

      await expect(
        service.updateDoacao(1, {
          volume: 15, // Menor que os 20 já direcionados
        }),
      ).rejects.toThrow(/não pode ser menor que o volume já direcionado/);

      expect(toastMock.error).toHaveBeenCalled();
    });

    it('deve atualizar com sucesso quando o volume é válido', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockDoacaoRaw], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      await service.fetchDoacoes();

      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockDoacaoRaw, volume: 60 },
          error: null,
        }),
      };
      supabaseMock.client.from.mockReturnValueOnce(updateBuilder).mockReturnValueOnce(queryBuilder);

      const res = await service.updateDoacao(1, { volume: 60 });
      expect(res?.volume).toBe(60);
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe('deleteDoacao', () => {
    it('deve excluir a doacao e recarregar os dados', async () => {
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabaseMock.client.from
        .mockReturnValueOnce(deleteBuilder)
        .mockReturnValueOnce(fetchBuilder)
        .mockReturnValueOnce(fetchBuilder);

      const res = await service.deleteDoacao(1);
      expect(res).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Doação #1 removida com sucesso!');
    });
  });

  describe('createDirecionamento', () => {
    it('deve impedir criação se o volume solicitado exceder o saldo disponível', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockDoacaoRaw], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      await service.fetchDoacoes(); // saldo disponível = 30

      await expect(
        service.createDirecionamento({
          id_doacao: 1,
          id_local: 3,
          volume: 35, // Ultrapassa os 30 disponíveis
        }),
      ).rejects.toThrow(/excede o saldo restante disponível/);

      expect(toastMock.error).toHaveBeenCalled();
    });

    it('deve registrar direcionamento quando volume for válido', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockDoacaoRaw], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      await service.fetchDoacoes();

      const insertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 11, id_doacao: 1, id_local: 3, volume: 15 },
          error: null,
        }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(queryBuilder);

      const res = await service.createDirecionamento({
        id_doacao: 1,
        id_local: 3,
        volume: 15,
      });

      expect(res?.id).toBe(11);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Direcionamento de insumos registrado com sucesso!',
      );
    });
  });

  describe('updateDirecionamento', () => {
    it('deve impedir atualização se o novo volume ultrapassar o saldo restante', async () => {
      const doacaoComDoisDirecionamentos = {
        ...mockDoacaoRaw,
        volume: 50,
        direcionamento_doacoes: [
          {
            id: 10,
            id_doacao: 1,
            id_local: 2,
            volume: 20,
            created_at: '2026-10-24T10:00:00Z',
            updated_at: '2026-10-24T10:00:00Z',
          },
          {
            id: 11,
            id_doacao: 1,
            id_local: 3,
            volume: 20,
            created_at: '2026-10-24T10:00:00Z',
            updated_at: '2026-10-24T10:00:00Z',
          },
        ],
      };

      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [doacaoComDoisDirecionamentos], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      await service.fetchDoacoes(); // Total 50, outros direcionamentos = 20, saldo para este = 30

      await expect(
        service.updateDirecionamento(10, 1, {
          volume: 35, // Ultrapassa os 30
        }),
      ).rejects.toThrow(/ultrapassa o limite máximo disponível/);

      expect(toastMock.error).toHaveBeenCalled();
    });

    it('deve atualizar direcionamento com sucesso quando o volume for válido', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockDoacaoRaw], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      await service.fetchDoacoes();

      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 10, id_doacao: 1, id_local: 2, volume: 25 },
          error: null,
        }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(queryBuilder);

      const res = await service.updateDirecionamento(10, 1, { volume: 25 });
      expect(res?.volume).toBe(25);
      expect(toastMock.success).toHaveBeenCalledWith('Direcionamento atualizado com sucesso!');
    });
  });

  describe('deleteDirecionamento', () => {
    it('deve excluir o direcionamento e restituir saldo', async () => {
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabaseMock.client.from
        .mockReturnValueOnce(deleteBuilder)
        .mockReturnValueOnce(fetchBuilder)
        .mockReturnValueOnce(fetchBuilder);

      const res = await service.deleteDirecionamento(10);
      expect(res).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Direcionamento removido! O volume foi restituído ao saldo da doação.',
      );
    });

    it('deve tratar erro na exclusão do direcionamento', async () => {
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Falha ao excluir') }),
      };
      supabaseMock.client.from.mockReturnValue(deleteBuilder);

      await expect(service.deleteDirecionamento(10)).rejects.toThrow();
      expect(toastMock.error).toHaveBeenCalledWith('Falha ao excluir');
    });
  });

  describe('Tratamento de exceções em mutações', () => {
    it('deve tratar erro ao falhar inserção de doação', async () => {
      const insertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      };
      supabaseMock.client.from.mockReturnValue(insertBuilder);

      await expect(
        service.createDoacao({
          tipo_doacao: 'Ração',
          volume: 10,
          doador: 'Teste',
          unidade_medida: 'kg',
        }),
      ).rejects.toThrow();
      expect(toastMock.error).toHaveBeenCalledWith('DB Error');
    });

    it('deve tratar erro ao falhar exclusão de doação', async () => {
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Erro ao deletar') }),
      };
      supabaseMock.client.from.mockReturnValue(deleteBuilder);

      await expect(service.deleteDoacao(99)).rejects.toThrow();
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao deletar');
    });

    it('deve tratar erro ao falhar inserção de direcionamento', async () => {
      const insertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Foreign key error') }),
      };
      supabaseMock.client.from.mockReturnValue(insertBuilder);

      await expect(
        service.createDirecionamento({ id_doacao: 99, id_local: 99, volume: 5 }),
      ).rejects.toThrow();
      expect(toastMock.error).toHaveBeenCalledWith('Foreign key error');
    });
  });
});
