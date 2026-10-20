import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Voluntario,
  VoluntarioCreateDto,
  VoluntarioFilter,
  VoluntarioUpdateDto,
} from '../models/voluntario.model';
import { VoluntariosService } from './voluntarios.service';

describe('VoluntariosService (Escala e Gestão de Voluntários)', () => {
  let service: VoluntariosService;
  let supabaseMock: {
    client: {
      from: ReturnType<typeof vi.fn>;
    };
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockVoluntarios: Voluntario[] = [
    {
      id: 1,
      nome: 'Juliana Paes',
      telefone: '51991112222',
      email: 'juliana@teste.com',
      dias_semana: ['Sábado', 'Domingo'],
      turnos: ['Manhã'],
      ativo: true,
    },
    {
      id: 2,
      nome: 'Marcos Souza',
      telefone: '51993334444',
      dias_semana: ['Segunda-feira', 'Quarta-feira'],
      turnos: ['Tarde'],
      ativo: true,
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
        VoluntariosService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(VoluntariosService);
  });

  describe('fetchVoluntarios', () => {
    it('deve listar voluntários e preencher o signal', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockVoluntarios, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchVoluntarios();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('voluntarios');
      expect(result).toEqual(mockVoluntarios);
      expect(service.voluntarios()).toEqual(mockVoluntarios);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve filtrar por telefone normalizando dígitos', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [mockVoluntarios[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: VoluntarioFilter = { searchField: 'telefone', searchValue: '(51) 99111-2222' };
      await service.fetchVoluntarios(filter);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('telefone', '%51991112222%');
    });

    it('deve filtrar por campo genérico (nome) via ilike', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [mockVoluntarios[0]], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: VoluntarioFilter = { searchField: 'nome', searchValue: 'Juliana' };
      await service.fetchVoluntarios(filter);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('nome', '%Juliana%');
    });

    it('deve filtrar por dia da semana e turno usando contains do PostgreSQL', async () => {
      const queryBuilder: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
      };
      queryBuilder['then'] = (resolve: (val: unknown) => unknown) =>
        resolve({ data: [mockVoluntarios[0]], error: null });
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: VoluntarioFilter = {
        dia_semana: 'Sábado',
        turno: 'Manhã',
      };
      await service.fetchVoluntarios(filter);

      const containsSpy = queryBuilder['contains'] as ReturnType<typeof vi.fn>;
      expect(containsSpy).toHaveBeenCalledWith('dias_semana', ['Sábado']);
      expect(containsSpy).toHaveBeenCalledWith('turnos', ['Manhã']);
    });

    it('deve tratar erro na consulta e disparar toast de erro', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Erro voluntários') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchVoluntarios();

      expect(result).toEqual([]);
      expect(service.error()).toBe('Erro voluntários');
      expect(toastMock.error).toHaveBeenCalledWith('Erro voluntários');
      expect(service.loading()).toBe(false);
    });
  });

  describe('getVoluntarioById', () => {
    it('deve retornar voluntário encontrado por ID', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVoluntarios[0], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getVoluntarioById(1);

      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(mockVoluntarios[0]);
    });

    it('deve retornar null e exibir toast se a busca por ID falhar', async () => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Não encontrado' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.getVoluntarioById(999);

      expect(result).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Não encontrado');
    });
  });

  describe('createVoluntario, updateVoluntario e deleteVoluntario', () => {
    it('deve cadastrar voluntário e emitir notificação de sucesso', async () => {
      const novoVoluntario: Voluntario = { id: 3, nome: 'Ana Paula', telefone: '51999990000' };
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: novoVoluntario, error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: [...mockVoluntarios, novoVoluntario], error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderInsert)
        .mockReturnValueOnce(queryBuilderFetch);

      const dto: VoluntarioCreateDto = { nome: 'Ana Paula', telefone: '51999990000' };
      const created = await service.createVoluntario(dto);

      expect(created).toEqual(novoVoluntario);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Voluntário(a) "Ana Paula" cadastrado com sucesso!',
      );
    });

    it('deve lançar erro e disparar toast se a criação de voluntário falhar', async () => {
      const queryBuilderInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro ao cadastrar' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderInsert);

      const dto: VoluntarioCreateDto = { nome: 'Falha', telefone: '123' };
      await expect(service.createVoluntario(dto)).rejects.toMatchObject({
        message: 'Erro ao cadastrar',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao cadastrar');
    });

    it('deve atualizar voluntário com sucesso e notificar', async () => {
      const updatedVoluntario: Voluntario = { ...mockVoluntarios[0], nome: 'Juliana Atualizada' };
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedVoluntario, error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [updatedVoluntario], error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderUpdate)
        .mockReturnValueOnce(queryBuilderFetch);

      const dto: VoluntarioUpdateDto = { nome: 'Juliana Atualizada' };
      const result = await service.updateVoluntario(1, dto);

      expect(result).toEqual(updatedVoluntario);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Voluntário(a) "Juliana Atualizada" atualizado com sucesso!',
      );
    });

    it('deve lançar erro e exibir toast se a atualização falhar', async () => {
      const queryBuilderUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro ao atualizar' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderUpdate);

      await expect(service.updateVoluntario(1, { nome: 'Invalido' })).rejects.toMatchObject({
        message: 'Erro ao atualizar',
      });
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao atualizar');
    });

    it('deve remover voluntário e recarregar a lista', async () => {
      const queryBuilderDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const queryBuilderFetch = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockVoluntarios[1]], error: null }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(queryBuilderDelete)
        .mockReturnValueOnce(queryBuilderFetch);

      const success = await service.deleteVoluntario(1);

      expect(success).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Voluntário removido com sucesso!');
    });

    it('deve retornar false e exibir toast se a exclusão falhar', async () => {
      const queryBuilderDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Erro ao excluir' } }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilderDelete);

      const success = await service.deleteVoluntario(999);

      expect(success).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao excluir');
    });
  });
});
