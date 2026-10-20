import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConsultaExame,
  ConsultaExameCreateDto,
  ConsultaExameUpdateDto,
} from '../models/consulta-exame.model';
import { ConsultasExamesService } from './consultas-exames.service';

describe('ConsultasExamesService (Histórico Clínico e Procedimentos)', () => {
  let service: ConsultasExamesService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockConsultas: ConsultaExame[] = [
    {
      id: 1,
      id_pet: 10,
      tipo_procedimento: 'Consulta',
      operacao_medicamento: 'Consulta Geral de Rotina',
      data_realizacao: '2026-06-01',
      custo: 120,
      diagnostico: 'Animal saudável',
    },
    {
      id: 2,
      id_pet: 10,
      tipo_procedimento: 'Exame',
      operacao_medicamento: 'Hemograma Completo',
      data_realizacao: '2026-06-02',
      custo: 85,
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
        ConsultasExamesService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(ConsultasExamesService);
  });

  describe('getConsultasExamesByPetId', () => {
    it('deve buscar lista de procedimentos ordenados por data e armazenar no signal', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockConsultas, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getConsultasExamesByPetId(10);

      expect(supabaseMock.client.from).toHaveBeenCalledWith('consultas_exames');
      expect(queryBuilder.select).toHaveBeenCalledWith('*, veterinario:id_veterinario(*)');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id_pet', 10);
      expect(result).toEqual(mockConsultas);
      expect(service.consultas()).toEqual(mockConsultas);

      // Cache hit
      supabaseMock.client.from.mockClear();
      const cached = await service.getConsultasExamesByPetId(10, false);
      expect(cached).toEqual(mockConsultas);
      expect(supabaseMock.client.from).not.toHaveBeenCalled();

      // forceRefresh = true
      supabaseMock.client.from.mockReturnValue(queryBuilder);
      const refreshed = await service.getConsultasExamesByPetId(10, true);
      expect(refreshed).toEqual(mockConsultas);
      expect(supabaseMock.client.from).toHaveBeenCalled();
    });

    it('deve retornar lista vazia se a consulta retornar erro', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro tabela' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getConsultasExamesByPetId(10);

      expect(result).toEqual([]);
      expect(service.consultas()).toEqual([]);
    });

    it('deve capturar exceção de rede e retornar lista vazia', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error('Falha de conexão')),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getConsultasExamesByPetId(10);

      expect(result).toEqual([]);
    });
  });

  describe('getConsultaExameById', () => {
    it('deve retornar do cache se o procedimento já estiver carregado', async () => {
      const queryBuilderGet = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockConsultas, error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getConsultasExamesByPetId(10);

      supabaseMock.client.from.mockClear();
      const cached = await service.getConsultaExameById(1);

      expect(cached).toEqual(mockConsultas[0]);
      expect(supabaseMock.client.from).not.toHaveBeenCalled();
    });

    it('deve buscar do banco caso não esteja em cache', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockConsultas[0], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getConsultaExameById(1);

      expect(result).toEqual(mockConsultas[0]);
    });

    it('deve retornar null e exibir toast se a busca falhar', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Procedimento inexistente' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getConsultaExameById(999);

      expect(result).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Procedimento inexistente');
    });
  });

  describe('createConsultaExame', () => {
    it('deve registrar novo procedimento e atualizar o signal de consultas', async () => {
      const queryBuilderGet = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockConsultas[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getConsultasExamesByPetId(10);

      const novoProcedimento: ConsultaExame = {
        id: 3,
        id_pet: 10,
        tipo_procedimento: 'Cirurgia',
        operacao_medicamento: 'Castração',
        data_realizacao: '2026-10-18',
        custo: 300,
      };

      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: novoProcedimento, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: ConsultaExameCreateDto = {
        id_pet: 10,
        tipo_procedimento: 'Cirurgia',
        operacao_medicamento: 'Castração',
        data_realizacao: '2026-10-18',
        custo: 300,
      };

      const created = await service.createConsultaExame(dto);

      expect(created).toEqual(novoProcedimento);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Procedimento "Castração" registrado com sucesso!',
      );
      expect(service.consultas()).toContainEqual(novoProcedimento);
    });

    it('deve lançar erro e disparar toast se a criação falhar', async () => {
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro ao inserir' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: ConsultaExameCreateDto = {
        id_pet: 10,
        tipo_procedimento: 'Consulta',
        operacao_medicamento: 'Rotina',
      };

      await expect(service.createConsultaExame(dto)).rejects.toMatchObject({
        message: 'Erro ao inserir',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao inserir');
    });
  });

  describe('updateConsultaExame e clearCache', () => {
    it('deve atualizar dados do procedimento e disparar toast de sucesso', async () => {
      const updatedConsulta: ConsultaExame = {
        ...mockConsultas[0],
        diagnostico: 'Recuperado 100%',
      };
      const queryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedConsulta, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const dto: ConsultaExameUpdateDto = { diagnostico: 'Recuperado 100%' };
      const result = await service.updateConsultaExame(1, dto);

      expect(result).toEqual(updatedConsulta);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Procedimento "Consulta Geral de Rotina" atualizado com sucesso!',
      );
    });

    it('deve lançar erro e disparar toast se a atualização falhar', async () => {
      const queryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro no update' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      await expect(service.updateConsultaExame(1, { custo: 50 })).rejects.toMatchObject({
        message: 'Erro no update',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Erro no update');
    });

    it('clearCache deve esvaziar cache e zerar signal', async () => {
      const queryBuilderGet = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockConsultas, error: null }),
      };
      supabaseMock.client.from.mockReturnValueOnce(queryBuilderGet);
      await service.getConsultasExamesByPetId(10);
      expect(service.consultas().length).toBeGreaterThan(0);

      service.clearCache();
      expect(service.consultas()).toEqual([]);
    });
  });
});
