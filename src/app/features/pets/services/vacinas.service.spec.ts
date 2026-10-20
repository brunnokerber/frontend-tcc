import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Vacina, VacinaCreateDto, VacinaUpdateDto } from '../models/vacina.model';
import { VacinasService } from './vacinas.service';

describe('VacinasService (Controle Vacinal e Imunização)', () => {
  let service: VacinasService;
  let supabaseMock: any;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockVacinas: Vacina[] = [
    {
      id: 1,
      id_pet: 10,
      nome_vacina: 'Antirrábica',
      data_aplicacao: '2026-05-10',
      data_prevista: '2026-05-10',
      dose: 'Única',
      fabricante: 'Zoetis',
      lote: 'L1234',
      custo: 50,
    },
    {
      id: 2,
      id_pet: 10,
      nome_vacina: 'V10',
      data_aplicacao: null,
      data_prevista: '2026-11-01',
      dose: '1ª Dose',
      fabricante: 'MSD',
      custo: 80,
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
        VacinasService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(VacinasService);
  });

  describe('getVacinasByPetId e cache', () => {
    it('deve consultar vacinas por id_pet e armazenar em cache', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockVacinas, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getVacinasByPetId(10);

      expect(supabaseMock.client.from).toHaveBeenCalledWith('vacinas');
      expect(queryBuilder.select).toHaveBeenCalledWith('*, veterinario:id_veterinario(*)');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id_pet', 10);
      expect(result).toEqual(mockVacinas);
      expect(service.vacinas()).toEqual(mockVacinas);

      // Segunda chamada deve vir do cache
      supabaseMock.client.from.mockClear();
      const cached = await service.getVacinasByPetId(10, false);
      expect(cached).toEqual(mockVacinas);
      expect(supabaseMock.client.from).not.toHaveBeenCalled();
    });

    it('deve retornar lista vazia se a tabela retornar erro', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getVacinasByPetId(999);

      expect(result).toEqual([]);
      expect(service.vacinas()).toEqual([]);
    });
  });

  describe('getVacinaById', () => {
    it('deve retornar do cache quando a vacina já estiver carregada no signal', async () => {
      const queryBuilderGet: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockVacinas, error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getVacinasByPetId(10);

      supabaseMock.client.from.mockClear();
      const vacina = await service.getVacinaById(1);

      expect(vacina).toEqual(mockVacinas[0]);
      expect(supabaseMock.client.from).not.toHaveBeenCalled();
    });

    it('deve buscar do Supabase quando não estiver em cache', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVacinas[0], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const vacina = await service.getVacinaById(1);

      expect(vacina).toEqual(mockVacinas[0]);
    });

    it('deve exibir toast e retornar null se a busca falhar', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Vacina não encontrada' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const vacina = await service.getVacinaById(999);

      expect(vacina).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Vacina não encontrada');
    });
  });

  describe('createVacina', () => {
    it('deve cadastrar nova vacina e atualizar a lista se corresponder ao pet em cache', async () => {
      const queryBuilderGet: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockVacinas[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getVacinasByPetId(10);

      const novaVacina: Vacina = {
        id: 3,
        id_pet: 10,
        nome_vacina: 'Giárdia',
        data_prevista: '2026-12-01',
        data_aplicacao: null,
      };

      const queryBuilderInsert: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: novaVacina, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: VacinaCreateDto = {
        id_pet: 10,
        nome_vacina: 'Giárdia',
        data_prevista: '2026-12-01',
      };

      const created = await service.createVacina(dto);

      expect(created).toEqual(novaVacina);
      expect(toastMock.success).toHaveBeenCalledWith('Vacina "Giárdia" registrada com sucesso!');
      expect(service.vacinas()).toContainEqual(novaVacina);
    });

    it('deve capturar erro e disparar toast se a inserção falhar', async () => {
      const queryBuilderInsert: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro ao inserir' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: VacinaCreateDto = { id_pet: 10, nome_vacina: 'V8', data_prevista: '2026-12-01' };

      await expect(service.createVacina(dto)).rejects.toThrow();
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao inserir');
    });
  });

  describe('updateVacina e aplicarVacinaRapida', () => {
    it('deve atualizar vacina existente e notificar sucesso', async () => {
      const updatedVacina = { ...mockVacinas[1], data_aplicacao: '2026-10-18' };
      const queryBuilder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedVacina, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const dto: VacinaUpdateDto = { data_aplicacao: '2026-10-18' };
      const result = await service.updateVacina(2, dto);

      expect(result).toEqual(updatedVacina);
      expect(toastMock.success).toHaveBeenCalledWith('Vacina "V10" atualizada com sucesso!');
    });

    it('deve capturar erro e disparar toast se a atualização falhar', async () => {
      const queryBuilder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Erro ao atualizar') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      await expect(service.updateVacina(2, { custo: 100 })).rejects.toThrow('Erro ao atualizar');
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao atualizar');
    });

    it('aplicarVacinaRapida deve chamar updateVacina com a data de aplicação especificada ou de hoje', async () => {
      const updatedVacina = { ...mockVacinas[1], data_aplicacao: '2026-10-18', id_veterinario: 4 };
      const queryBuilder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedVacina, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.aplicarVacinaRapida(2, '2026-10-18', 4, 75);

      expect(result).toEqual(updatedVacina);
    });
  });

  describe('getVacinasCalendario', () => {
    it('deve aplicar filtros de status (previstas / aplicadas) e datas no calendário', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockVacinas[1]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const items = await service.getVacinasCalendario({
        petId: 10,
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        status: 'previstas',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('id_pet', 10);
      expect(queryBuilder.gte).toHaveBeenCalledWith('data_prevista', '2026-10-01');
      expect(queryBuilder.lte).toHaveBeenCalledWith('data_prevista', '2026-12-31');
      expect(queryBuilder.is).toHaveBeenCalledWith('data_aplicacao', null);
      expect(items).toEqual([mockVacinas[1]]);
    });

    it('deve aplicar filtro status=aplicadas no calendário', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockVacinas[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const items = await service.getVacinasCalendario({ status: 'aplicadas' });
      expect(queryBuilder.not).toHaveBeenCalledWith('data_aplicacao', 'is', null);
      expect(items).toEqual([mockVacinas[0]]);
    });

    it('deve retornar lista vazia se a consulta do calendário falhar', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro calendario' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const items = await service.getVacinasCalendario();
      expect(items).toEqual([]);
    });
  });

  describe('deleteVacina', () => {
    it('deve remover vacina e atualizar a lista reativa', async () => {
      const queryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const success = await service.deleteVacina(1);

      expect(success).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Vacina removida com sucesso!');
      expect(service.vacinas().find((v) => v.id === 1)).toBeUndefined();
    });

    it('deve disparar toast e retornar false se a exclusão falhar', async () => {
      const queryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Erro ao deletar') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const success = await service.deleteVacina(999);

      expect(success).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao deletar');
    });
  });

  describe('clearCache', () => {
    it('deve limpar o cache de pet e a lista de vacinas', () => {
      service.clearCache();
      expect(service.vacinas()).toEqual([]);
    });
  });
});
