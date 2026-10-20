import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Veterinario,
  VeterinarioCreateDto,
  VeterinarioFilter,
  VeterinarioUpdateDto,
} from '../models/veterinario.model';
import { VeterinariosService } from './veterinarios.service';

describe('VeterinariosService (Gestão de Profissionais Veterinários)', () => {
  let service: VeterinariosService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockVeterinarios: Veterinario[] = [
    {
      id: 1,
      nome: 'Dra. Camila Santos',
      crmv: 'CRMV-RS 12345',
      telefone: '51987654321',
      clinica: 'Vet Care',
      email: 'camila@vetcare.com',
    },
    {
      id: 2,
      nome: 'Dr. Lucas Silva',
      crmv: 'CRMV-RS 67890',
      telefone: '51998765432',
      clinica: 'Hospital Pet',
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
        VeterinariosService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(VeterinariosService);
  });

  describe('fetchVeterinarios', () => {
    it('deve listar profissionais e atualizar o signal veterinarios', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockVeterinarios, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchVeterinarios();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('veterinarios');
      expect(result).toEqual(mockVeterinarios);
      expect(service.veterinarios()).toEqual(mockVeterinarios);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve filtrar por telefone normalizando dígitos', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [mockVeterinarios[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: VeterinarioFilter = {
        searchField: 'telefone',
        searchValue: '(51) 98765-4321',
      };
      await service.fetchVeterinarios(filter);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('telefone', '%51987654321%');
    });

    it('deve filtrar por outro campo via ilike', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [mockVeterinarios[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: VeterinarioFilter = { searchField: 'nome', searchValue: 'Camila' };
      await service.fetchVeterinarios(filter);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('nome', '%Camila%');
    });

    it('deve tratar erro na consulta e disparar toast de erro', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Erro veterinários') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchVeterinarios();

      expect(result).toEqual([]);
      expect(service.error()).toBe('Erro veterinários');
      expect(toastMock.error).toHaveBeenCalledWith('Erro veterinários');
      expect(service.loading()).toBe(false);
    });
  });

  describe('getVeterinarioById', () => {
    it('deve retornar dados do veterinário por ID', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVeterinarios[0], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getVeterinarioById(1);

      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(mockVeterinarios[0]);
    });

    it('deve retornar null e exibir toast se a busca por ID falhar', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Não encontrado' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getVeterinarioById(999);

      expect(result).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Não encontrado');
    });
  });

  describe('createVeterinario e updateVeterinario', () => {
    it('deve cadastrar novo veterinário e notificar com toast de sucesso', async () => {
      const novoVet: Veterinario = { id: 3, nome: 'Dr. Roberto', crmv: '11111' };
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: novoVet, error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [...mockVeterinarios, novoVet], error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderInsert)
        .mockReturnValueOnce(queryBuilderFetch);

      const dto: VeterinarioCreateDto = { nome: 'Dr. Roberto', crmv: '11111' };
      const created = await service.createVeterinario(dto);

      expect(created).toEqual(novoVet);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Veterinário(a) "Dr. Roberto" cadastrado(a) com sucesso!',
      );
    });

    it('deve lançar erro e disparar toast se a criação falhar', async () => {
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'CRMV já existente' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: VeterinarioCreateDto = { nome: 'Dr. Roberto', crmv: '11111' };

      await expect(service.createVeterinario(dto)).rejects.toMatchObject({
        message: 'CRMV já existente',
      });
      expect(toastMock.error).toHaveBeenCalledWith('CRMV já existente');
    });

    it('deve atualizar dados do veterinário existente', async () => {
      const updatedVet: Veterinario = { ...mockVeterinarios[0], clinica: 'Clínica Nova' };
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedVet, error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [updatedVet], error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderUpdate)
        .mockReturnValueOnce(queryBuilderFetch);

      const dto: VeterinarioUpdateDto = { clinica: 'Clínica Nova' };
      const result = await service.updateVeterinario(1, dto);

      expect(result).toEqual(updatedVet);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Veterinário(a) "Dra. Camila Santos" atualizado(a) com sucesso!',
      );
    });

    it('deve lançar erro e disparar toast se a atualização falhar', async () => {
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Falha ao atualizar' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderUpdate);

      await expect(service.updateVeterinario(1, { nome: 'Invalido' })).rejects.toMatchObject({
        message: 'Falha ao atualizar',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Falha ao atualizar');
    });
  });
});
