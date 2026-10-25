import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Despesa, DespesaCreateDto, DespesaUpdateDto } from '../models/despesa.model';
import { DespesasService } from './despesas.service';

describe('DespesasService (Gestão de Despesas Gerais da ONG)', () => {
  let service: DespesasService;
  let supabaseMock: any;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockDespesas: Despesa[] = [
    {
      id: 1,
      descricao: '10 sacos de ração',
      categoria: 'Alimentação / Ração',
      valor: 850.0,
      data_despesa: '2026-10-15',
      favorecido: 'Agropecuária Central',
      telefone: '51999998888',
      observacoes: 'Nota fiscal 1234',
      id_pet: null,
      pet: null,
      created_at: '2026-10-15T10:00:00Z',
      updated_at: '2026-10-15T10:00:00Z',
      updated_by: 'uuid-admin-1',
    },
    {
      id: 2,
      descricao: 'Produtos de limpeza pesada',
      categoria: 'Higiene & Limpeza',
      valor: 230.5,
      data_despesa: '2026-10-20',
      favorecido: 'Distribuidora Limpa Tudo',
      telefone: null,
      observacoes: null,
      id_pet: 10,
      pet: { id: 10, nome: 'Thor', tipo_pet: 'Cachorro' },
      created_at: '2026-10-20T14:30:00Z',
      updated_at: '2026-10-20T14:30:00Z',
      updated_by: 'uuid-admin-1',
    },
  ];

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
        DespesasService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(DespesasService);
  });

  describe('fetchDespesas', () => {
    it('deve listar despesas com sucesso e atualizar o signal despesas', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      // O segundo order resolve a promise com os dados
      queryBuilder.order
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce({ data: mockDespesas, error: null });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchDespesas();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('despesas');
      expect(queryBuilder.select).toHaveBeenCalledWith('*, pet:id_pet(id, nome, tipo_pet)');
      expect(result).toEqual(mockDespesas);
      expect(service.despesas()).toEqual(mockDespesas);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve aplicar filtros de categoria, período e busca textual', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.or.mockResolvedValue({ data: [mockDespesas[0]], error: null });
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      await service.fetchDespesas({
        categoria: 'Alimentação / Ração',
        dataInicio: '2026-10-01',
        dataFim: '2026-10-31',
        searchTerm: 'Agropecuária',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('categoria', 'Alimentação / Ração');
      expect(queryBuilder.gte).toHaveBeenCalledWith('data_despesa', '2026-10-01');
      expect(queryBuilder.lte).toHaveBeenCalledWith('data_despesa', '2026-10-31');
      expect(queryBuilder.or).toHaveBeenCalledWith(
        'descricao.ilike.%Agropecuária%,favorecido.ilike.%Agropecuária%',
      );
    });

    it('deve tratar erro na listagem de despesas e exibir toast', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      queryBuilder.order
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce({ data: null, error: new Error('Erro de conexão') });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchDespesas();

      expect(result).toEqual([]);
      expect(service.despesas()).toEqual([]);
      expect(service.error()).toBe('Erro de conexão');
      expect(toastMock.error).toHaveBeenCalledWith('Erro de conexão');
      expect(service.loading()).toBe(false);
    });
  });

  describe('createDespesa', () => {
    it('deve cadastrar nova despesa e adicioná-la à lista com sucesso', async () => {
      const dto: DespesaCreateDto = {
        descricao: 'Nova compra de vacinas avulsas',
        categoria: 'Medicamentos & Insumos Gerais',
        valor: 400.0,
        data_despesa: '2026-10-22',
        favorecido: 'Vet Pharma',
        telefone: '(51) 98888-7777',
        observacoes: 'Lote 998',
        id_pet: null,
      };

      const created: Despesa = {
        id: 3,
        descricao: dto.descricao,
        categoria: dto.categoria,
        valor: dto.valor,
        data_despesa: dto.data_despesa,
        favorecido: dto.favorecido,
        telefone: '51988887777',
        observacoes: dto.observacoes || null,
        id_pet: null,
        pet: null,
        created_at: '2026-10-22T12:00:00Z',
        updated_at: '2026-10-22T12:00:00Z',
        updated_by: 'uuid-admin-1',
      };

      const queryBuilder: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: created, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.createDespesa(dto);

      expect(supabaseMock.client.from).toHaveBeenCalledWith('despesas');
      expect(queryBuilder.insert).toHaveBeenCalledWith({
        descricao: 'Nova compra de vacinas avulsas',
        categoria: 'Medicamentos & Insumos Gerais',
        valor: 400.0,
        data_despesa: '2026-10-22',
        favorecido: 'Vet Pharma',
        telefone: '51988887777',
        observacoes: 'Lote 998',
        id_pet: null,
      });
      expect(result).toEqual(created);
      expect(service.despesas()[0]).toEqual(created);
      expect(toastMock.success).toHaveBeenCalledWith('Despesa registrada com sucesso!');
    });

    it('deve disparar toast e retornar null em caso de erro ao criar', async () => {
      const dto: DespesaCreateDto = {
        descricao: 'Teste',
        categoria: 'Outro',
        valor: 10,
        data_despesa: '2026-10-24',
        favorecido: 'Loja',
      };

      const queryBuilder: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Falha no banco') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.createDespesa(dto);

      expect(result).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Falha no banco');
    });
  });

  describe('updateDespesa', () => {
    it('deve atualizar despesa existente e atualizar o signal', async () => {
      service.despesas.set([...mockDespesas]);

      const dto: DespesaUpdateDto = {
        descricao: '10 sacos de ração premium (atualizado)',
        valor: 920.0,
      };

      const updatedDespesa: Despesa = {
        ...mockDespesas[0],
        descricao: '10 sacos de ração premium (atualizado)',
        valor: 920.0,
      };

      const queryBuilder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedDespesa, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.updateDespesa(1, dto);

      expect(queryBuilder.update).toHaveBeenCalledWith({
        descricao: '10 sacos de ração premium (atualizado)',
        valor: 920.0,
      });
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(updatedDespesa);
      expect(service.despesas()[0].valor).toBe(920.0);
      expect(toastMock.success).toHaveBeenCalledWith('Despesa atualizada com sucesso!');
    });
  });

  describe('deleteDespesa', () => {
    it('deve excluir despesa com sucesso e remover da lista', async () => {
      service.despesas.set([...mockDespesas]);

      const queryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const success = await service.deleteDespesa(1);

      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
      expect(success).toBe(true);
      expect(service.despesas().length).toBe(1);
      expect(service.despesas()[0].id).toBe(2);
      expect(toastMock.success).toHaveBeenCalledWith('Despesa excluída com sucesso!');
    });

    it('deve disparar mensagem de advertência e retornar false se exclusão for negada por RLS', async () => {
      const queryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('permission denied for table despesas') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const success = await service.deleteDespesa(2);

      expect(success).toBe(false);
      expect(toastMock.error).toHaveBeenCalled();
    });
  });

  describe('getDespesasByPetId', () => {
    it('deve consultar despesas filtradas por id_pet ordenadas por data', async () => {
      const petDespesas = [mockDespesas[1]];
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      queryBuilder.order
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce({ data: petDespesas, error: null });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getDespesasByPetId(10);

      expect(supabaseMock.client.from).toHaveBeenCalledWith('despesas');
      expect(queryBuilder.select).toHaveBeenCalledWith('*, pet:id_pet(id, nome, tipo_pet)');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id_pet', 10);
      expect(result).toEqual(petDespesas);
    });

    it('deve retornar do cache em chamadas consecutivas para o mesmo petId sem forceRefresh', async () => {
      const petDespesas = [mockDespesas[1]];
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      queryBuilder.order
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce({ data: petDespesas, error: null });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      // Primeira chamada - busca no banco
      const result1 = await service.getDespesasByPetId(10);
      expect(result1).toEqual(petDespesas);
      expect(supabaseMock.client.from).toHaveBeenCalledTimes(1);

      // Segunda chamada - deve retornar do cache sem chamar o Supabase
      const result2 = await service.getDespesasByPetId(10);
      expect(result2).toEqual(petDespesas);
      expect(supabaseMock.client.from).toHaveBeenCalledTimes(1);

      // Terceira chamada com forceRefresh = true - deve re-consultar o Supabase
      queryBuilder.order
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce({ data: petDespesas, error: null });
      const result3 = await service.getDespesasByPetId(10, true);
      expect(result3).toEqual(petDespesas);
      expect(supabaseMock.client.from).toHaveBeenCalledTimes(2);
    });

    it('deve retornar lista vazia e exibir toast de erro se consulta falhar', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      queryBuilder.order
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce({ data: null, error: new Error('Erro de conexão') });

      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getDespesasByPetId(99);

      expect(result).toEqual([]);
      expect(toastMock.error).toHaveBeenCalledWith('Erro de conexão');
    });
  });
});
