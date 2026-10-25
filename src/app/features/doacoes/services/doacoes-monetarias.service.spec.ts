import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoacoesMonetariasService } from './doacoes-monetarias.service';

describe('DoacoesMonetariasService', () => {
  let service: DoacoesMonetariasService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockDoacaoMonetariaRaw = {
    id: 1,
    valor: 250.0,
    doador: 'Carlos Eduardo',
    telefone: '51999991234',
    data_doacao: '2026-10-24',
    observacoes: 'Doação espontânea via Pix',
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
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
        DoacoesMonetariasService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(DoacoesMonetariasService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchDoacoesMonetarias', () => {
    it('deve listar doacoes monetárias, normalizar valores e computar KPIs', async () => {
      const queryBuilder: Record<string, unknown> = {};
      queryBuilder['select'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['order'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['ilike'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['gte'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['lte'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['then'] = (resolve: (val: unknown) => unknown) =>
        resolve({ data: [mockDoacaoMonetariaRaw], error: null });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchDoacoesMonetarias();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('doacoes_monetarias');
      expect(result.length).toBe(1);
      expect(result[0].valor).toBe(250);
      expect(service.totalArrecadado()).toBe(250);
      expect(service.totalDoacoesCount()).toBe(1);
      expect(service.mediaPorDoacao()).toBe(250);
      expect(service.maiorDoacao()).toBe(250);
      expect(service.loading()).toBe(false);
    });

    it('deve aplicar filtros de busca por telefone e doador', async () => {
      const queryBuilder: Record<string, unknown> = {};
      queryBuilder['select'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['order'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['ilike'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['gte'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['lte'] = vi.fn().mockReturnValue(queryBuilder);
      queryBuilder['then'] = (resolve: (val: unknown) => unknown) =>
        resolve({ data: [mockDoacaoMonetariaRaw], error: null });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      await service.fetchDoacoesMonetarias({
        searchField: 'telefone',
        searchValue: '(51) 99999-1234',
      });
      expect(queryBuilder['ilike']).toHaveBeenCalledWith('telefone', '%51999991234%');

      await service.fetchDoacoesMonetarias({ searchField: 'doador', searchValue: 'Carlos' });
      expect(queryBuilder['ilike']).toHaveBeenCalledWith('doador', '%Carlos%');
    });

    it('deve tratar erro ao falhar consulta', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      queryBuilder.order
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce({ data: null, error: new Error('Falha de conexão') });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const res = await service.fetchDoacoesMonetarias();
      expect(res).toEqual([]);
      expect(service.error()).toBe('Falha de conexão');
      expect(toastMock.error).toHaveBeenCalled();
    });
  });

  describe('createDoacaoMonetaria', () => {
    it('deve cadastrar com sucesso, exibir toast e recarregar lista', async () => {
      const insertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDoacaoMonetariaRaw, error: null }),
      };
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      fetchBuilder.order
        .mockReturnValueOnce(fetchBuilder)
        .mockResolvedValueOnce({ data: [], error: null });

      supabaseMock.client.from.mockReturnValueOnce(insertBuilder).mockReturnValueOnce(fetchBuilder);

      const res = await service.createDoacaoMonetaria({
        valor: 250,
        doador: 'Carlos Eduardo',
        telefone: '(51) 99999-1234',
      });

      expect(res?.id).toBe(1);
      expect(toastMock.success).toHaveBeenCalled();
    });

    it('deve propagar erro e exibir toast ao falhar inserção', async () => {
      const insertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Erro insert') }),
      };
      supabaseMock.client.from.mockReturnValue(insertBuilder);

      await expect(
        service.createDoacaoMonetaria({ valor: 100, doador: 'Teste' }),
      ).rejects.toThrow();
      expect(toastMock.error).toHaveBeenCalledWith('Erro insert');
    });
  });

  describe('updateDoacaoMonetaria', () => {
    it('deve atualizar doação com sucesso', async () => {
      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockDoacaoMonetariaRaw, valor: 300 },
          error: null,
        }),
      };
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      fetchBuilder.order
        .mockReturnValueOnce(fetchBuilder)
        .mockResolvedValueOnce({ data: [], error: null });

      supabaseMock.client.from.mockReturnValueOnce(updateBuilder).mockReturnValueOnce(fetchBuilder);

      const res = await service.updateDoacaoMonetaria(1, { valor: 300 });
      expect(res?.valor).toBe(300);
      expect(toastMock.success).toHaveBeenCalledWith('Doação #1 atualizada com sucesso!');
    });
  });

  describe('deleteDoacaoMonetaria', () => {
    it('deve excluir doação com sucesso quando executado por admin', async () => {
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      fetchBuilder.order
        .mockReturnValueOnce(fetchBuilder)
        .mockResolvedValueOnce({ data: [], error: null });

      supabaseMock.client.from.mockReturnValueOnce(deleteBuilder).mockReturnValueOnce(fetchBuilder);

      const res = await service.deleteDoacaoMonetaria(1);
      expect(res).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Doação monetária #1 excluída com sucesso!');
    });

    it('deve tratar erro caso a exclusão falhe por RLS ou permissão', async () => {
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Permission denied') }),
      };
      supabaseMock.client.from.mockReturnValue(deleteBuilder);

      await expect(service.deleteDoacaoMonetaria(1)).rejects.toThrow();
      expect(toastMock.error).toHaveBeenCalledWith('Permission denied');
    });
  });
});
