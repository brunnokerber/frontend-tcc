import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Local, LocalCreateDto, LocalFilter, LocalUpdateDto } from '../models/local.model';
import { LocaisService } from './locais.service';

describe('LocaisService (Gestão de Locais e Integração ViaCEP)', () => {
  let service: LocaisService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockLocais: Local[] = [
    {
      id: 1,
      local: 'Abrigo Central',
      tipo_local: 'Abrigo',
      telefone: '51999998888',
      cidade: 'Novo Hamburgo',
      uf: 'RS',
    },
    {
      id: 2,
      local: 'Lar da Maria',
      tipo_local: 'Lar Temporário',
      telefone: '51988887777',
      cidade: 'São Leopoldo',
      uf: 'RS',
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
        LocaisService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(LocaisService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchLocais', () => {
    it('deve listar locais e salvar no signal locais', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLocais, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchLocais();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('locais');
      expect(result).toEqual(mockLocais);
      expect(service.locais()).toEqual(mockLocais);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve filtrar por tipo_local usando igualdade estrita (eq)', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [mockLocais[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: LocalFilter = { searchField: 'tipo_local', searchValue: 'Abrigo' };
      const result = await service.fetchLocais(filter);

      expect(queryBuilder.eq).toHaveBeenCalledWith('tipo_local', 'Abrigo');
      expect(result).toHaveLength(1);
    });

    it('deve filtrar por telefone normalizando dígitos via ilike', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [mockLocais[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: LocalFilter = { searchField: 'telefone', searchValue: '(51) 99999-8888' };
      await service.fetchLocais(filter);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('telefone', '%51999998888%');
    });

    it('deve filtrar por campo genérico (cidade) via ilike', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [mockLocais[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: LocalFilter = { searchField: 'cidade', searchValue: 'Novo Hamburgo' };
      await service.fetchLocais(filter);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('cidade', '%Novo Hamburgo%');
    });

    it('deve tratar erro na consulta de locais e exibir toast de erro', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Erro de conexão') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchLocais();

      expect(result).toEqual([]);
      expect(service.error()).toBe('Erro de conexão');
      expect(toastMock.error).toHaveBeenCalledWith('Erro de conexão');
      expect(service.loading()).toBe(false);
    });
  });

  describe('getLocalById', () => {
    it('deve retornar local encontrado por ID', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLocais[0], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getLocalById(1);

      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(mockLocais[0]);
    });

    it('deve retornar null e exibir toast caso a busca por ID falhe', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Local não encontrado' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getLocalById(999);

      expect(result).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Local não encontrado');
    });
  });

  describe('createLocal e updateLocal', () => {
    it('deve criar novo local e atualizar a listagem', async () => {
      const novoLocal: Local = { id: 3, local: 'Clínica Amiga', tipo_local: 'Clínica Veterinária' };
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: novoLocal, error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [...mockLocais, novoLocal], error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderInsert)
        .mockReturnValueOnce(queryBuilderFetch);

      const dto: LocalCreateDto = { local: 'Clínica Amiga', tipo_local: 'Clínica Veterinária' };
      const created = await service.createLocal(dto);

      expect(created).toEqual(novoLocal);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Local "Clínica Amiga" cadastrado com sucesso!',
      );
    });

    it('deve lançar erro e exibir toast caso a criação de local falhe', async () => {
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Nome já em uso' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: LocalCreateDto = { local: 'Clínica Duplicada', tipo_local: 'Clínica Veterinária' };

      await expect(service.createLocal(dto)).rejects.toMatchObject({ message: 'Nome já em uso' });
      expect(toastMock.error).toHaveBeenCalledWith('Nome já em uso');
    });

    it('deve atualizar local existente e notificar com sucesso', async () => {
      const updatedLocal: Local = { ...mockLocais[0], local: 'Abrigo Central Reformado' };
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedLocal, error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [updatedLocal], error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderUpdate)
        .mockReturnValueOnce(queryBuilderFetch);

      const dto: LocalUpdateDto = { local: 'Abrigo Central Reformado' };
      const result = await service.updateLocal(1, dto);

      expect(result).toEqual(updatedLocal);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Local "Abrigo Central Reformado" atualizado com sucesso!',
      );
    });

    it('deve lançar erro e exibir toast caso a atualização de local falhe', async () => {
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Falha ao atualizar' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderUpdate);

      await expect(service.updateLocal(1, { local: 'Nome Inválido' })).rejects.toMatchObject({
        message: 'Falha ao atualizar',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Falha ao atualizar');
    });
  });

  describe('fetchAddressByCep (ViaCEP)', () => {
    it('deve retornar null se o CEP não possuir exatamente 8 dígitos', async () => {
      expect(await service.fetchAddressByCep('123')).toBeNull();
      expect(await service.fetchAddressByCep('')).toBeNull();
    });

    it('deve consultar o ViaCEP e mapear logradouro, bairro, cidade e estado', async () => {
      const mockViaCepResponse = {
        logradouro: 'Av. Maurício Cardoso',
        bairro: 'Hamburgo Velho',
        localidade: 'Novo Hamburgo',
        uf: 'RS',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockViaCepResponse),
      } as unknown as Response);

      const address = await service.fetchAddressByCep('93.510-250');

      expect(global.fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/93510250/json/');
      expect(address).toEqual({
        rua: 'Av. Maurício Cardoso',
        bairro: 'Hamburgo Velho',
        cidade: 'Novo Hamburgo',
        estado: 'RS',
      });
    });

    it('deve retornar null quando o ViaCEP responder com status HTTP diferente de 2xx', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      } as unknown as Response);

      const address = await service.fetchAddressByCep('99999-999');
      expect(address).toBeNull();
    });

    it('deve retornar null quando o ViaCEP responder com flag de erro', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ erro: true }),
      } as unknown as Response);

      const address = await service.fetchAddressByCep('00000-000');
      expect(address).toBeNull();
    });

    it('deve retornar null caso a requisição de rede lance exceção', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const address = await service.fetchAddressByCep('93510-250');
      expect(address).toBeNull();
    });
  });
});
