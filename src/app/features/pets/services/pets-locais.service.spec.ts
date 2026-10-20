import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PetLocal, PetLocalCreateDto, PetLocalUpdateDto } from '../models/pet-local.model';
import { PetsLocaisService } from './pets-locais.service';

describe('PetsLocaisService (Histórico de Passagem por Locais)', () => {
  let service: PetsLocaisService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockPetsLocais: PetLocal[] = [
    {
      id: 1,
      id_pet: 10,
      id_local: 2,
      data_saida: '2026-08-01',
      motivo_saida: 'Lar Temporário',
      valor_auxilio: 150,
      obs: 'Em recuperação',
    },
    {
      id: 2,
      id_pet: 10,
      id_local: 3,
      data_saida: '2026-10-10',
      motivo_saida: 'Adoção Definitiva',
      valor_auxilio: null,
      obs: 'Adotado',
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
        PetsLocaisService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(PetsLocaisService);
  });

  describe('getPetsLocaisByPetId', () => {
    it('deve buscar histórico de locais e armazenar no signal', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPetsLocais, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getPetsLocaisByPetId(10);

      expect(supabaseMock.client.from).toHaveBeenCalledWith('pets_locais');
      expect(queryBuilder.select).toHaveBeenCalledWith('*, locais:id_local(*)');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id_pet', 10);
      expect(result).toEqual(mockPetsLocais);
      expect(service.petsLocais()).toEqual(mockPetsLocais);

      // Cache hit
      supabaseMock.client.from.mockClear();
      const cached = await service.getPetsLocaisByPetId(10, false);
      expect(cached).toEqual(mockPetsLocais);
      expect(supabaseMock.client.from).not.toHaveBeenCalled();

      // forceRefresh = true
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      const refreshed = await service.getPetsLocaisByPetId(10, true);
      expect(refreshed).toEqual(mockPetsLocais);
      expect(supabaseMock.client.from).toHaveBeenCalled();
    });

    it('deve retornar lista vazia se a consulta retornar erro', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro tabela' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getPetsLocaisByPetId(10);

      expect(result).toEqual([]);
      expect(service.petsLocais()).toEqual([]);
    });

    it('deve capturar exceção de rede e retornar lista vazia', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error('Falha de conexão')),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getPetsLocaisByPetId(10);

      expect(result).toEqual([]);
    });
  });

  describe('getPetLocalById', () => {
    it('deve retornar do cache se o local já estiver carregado', async () => {
      const queryBuilderGet = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPetsLocais, error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getPetsLocaisByPetId(10);

      supabaseMock.client.from.mockClear();
      const cached = await service.getPetLocalById(1);

      expect(cached).toEqual(mockPetsLocais[0]);
      expect(supabaseMock.client.from).not.toHaveBeenCalled();
    });

    it('deve buscar do banco caso não esteja em cache', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPetsLocais[0], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getPetLocalById(1);

      expect(result).toEqual(mockPetsLocais[0]);
    });

    it('deve retornar null e exibir toast se a busca falhar', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Registro inexistente' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getPetLocalById(999);

      expect(result).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Registro inexistente');
    });
  });

  describe('createPetLocal', () => {
    it('deve inserir local de passagem e atualizar lista em cache', async () => {
      const queryBuilderGet = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockPetsLocais[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getPetsLocaisByPetId(10);

      const novoLocal: PetLocal = {
        id: 3,
        id_pet: 10,
        id_local: 5,
        data_saida: '2026-10-18',
        motivo_saida: 'Clínica Parceira',
      };

      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: novoLocal, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: PetLocalCreateDto = {
        id_pet: 10,
        id_local: 5,
        data_saida: '2026-10-18',
        motivo_saida: 'Clínica Parceira',
      };

      const created = await service.createPetLocal(dto);

      expect(created).toEqual(novoLocal);
      expect(toastMock.success).toHaveBeenCalledWith('Local de passagem registrado com sucesso!');
      expect(service.petsLocais()).toContainEqual(novoLocal);
    });

    it('deve lançar erro e disparar toast se a criação falhar', async () => {
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro ao inserir' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: PetLocalCreateDto = { id_pet: 10, id_local: 2, motivo_saida: 'Teste' };

      await expect(service.createPetLocal(dto)).rejects.toMatchObject({
        message: 'Erro ao inserir',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao inserir');
    });
  });

  describe('updatePetLocal e clearCache', () => {
    it('deve atualizar o registro de local de passagem e refletir no signal', async () => {
      const updatedLocal: PetLocal = { ...mockPetsLocais[0], obs: 'Atualizado com sucesso' };
      const queryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedLocal, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const dto: PetLocalUpdateDto = { obs: 'Atualizado com sucesso' };
      const result = await service.updatePetLocal(1, dto);

      expect(result).toEqual(updatedLocal);
      expect(toastMock.success).toHaveBeenCalledWith('Local de passagem atualizado com sucesso!');
    });

    it('deve lançar erro e disparar toast se a atualização falhar', async () => {
      const queryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro no update' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      await expect(service.updatePetLocal(1, { obs: 'Erro' })).rejects.toMatchObject({
        message: 'Erro no update',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Erro no update');
    });

    it('clearCache deve esvaziar cache e zerar signal', async () => {
      const queryBuilderGet = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPetsLocais, error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getPetsLocaisByPetId(10);
      expect(service.petsLocais().length).toBeGreaterThan(0);

      service.clearCache();
      expect(service.petsLocais()).toEqual([]);
    });
  });
});
