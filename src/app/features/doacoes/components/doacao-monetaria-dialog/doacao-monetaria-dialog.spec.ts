import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';
import { ToastService } from '@core/services/toast.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoacaoMonetaria } from '../../models/doacao-monetaria.model';
import { DoacoesMonetariasService } from '../../services/doacoes-monetarias.service';
import {
  DoacaoMonetariaDialogComponent,
  DoacaoMonetariaDialogData,
} from './doacao-monetaria-dialog';

describe('DoacaoMonetariaDialogComponent', () => {
  let fixture: ComponentFixture<DoacaoMonetariaDialogComponent>;
  let component: DoacaoMonetariaDialogComponent;

  let dialogRefMock: { close: ReturnType<typeof vi.fn> };
  let doacoesMonetariasServiceMock: {
    createDoacaoMonetaria: ReturnType<typeof vi.fn>;
    updateDoacaoMonetaria: ReturnType<typeof vi.fn>;
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let dialogData: DoacaoMonetariaDialogData;

  const mockDoacaoExistente: DoacaoMonetaria = {
    id: 10,
    valor: 150.0,
    doador: 'Clara Nunes',
    telefone: '51998765432',
    data_doacao: '2026-10-20',
    observacoes: 'Contribuição mensal',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  };

  const setupTestBed = (data: DoacaoMonetariaDialogData = {}) => {
    dialogRefMock = { close: vi.fn() };
    doacoesMonetariasServiceMock = {
      createDoacaoMonetaria: vi.fn(),
      updateDoacaoMonetaria: vi.fn(),
    };
    toastMock = { success: vi.fn(), error: vi.fn() };
    dialogData = data;

    TestBed.configureTestingModule({
      imports: [DoacaoMonetariaDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: DoacoesMonetariasService, useValue: doacoesMonetariasServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: AuthService, useValue: { isAdmin: () => true } },
        {
          provide: AuditResolverService,
          useValue: { resolveUser: vi.fn().mockResolvedValue(null) },
        },
      ],
    });

    fixture = TestBed.createComponent(DoacaoMonetariaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modo de Criação (Nova Doação)', () => {
    beforeEach(() => {
      setupTestBed({});
    });

    it('deve inicializar com formulário vazio e modo de criação', () => {
      expect(component.isEditing()).toBe(false);
      expect(component.form.controls.doador.value).toBe('');
      expect(component.form.controls.telefone.value).toBe('');
      expect(component.form.controls.valor.value).toBeNull();
      expect(component.form.valid).toBe(false);
    });

    it('deve permitir definir valor através do método auxiliar setValor', () => {
      component.setValor(200);
      expect(component.form.controls.valor.value).toBe(200);
      expect(component.form.controls.valor.dirty).toBe(true);
    });

    it('deve fechar o diálogo ao cancelar', () => {
      component.onCancel();
      expect(dialogRefMock.close).toHaveBeenCalledWith(null);
    });

    it('não deve salvar se o formulário for inválido', async () => {
      await component.onSave();
      expect(toastMock.error).toHaveBeenCalledWith('Preencha os campos obrigatórios corretamente.');
      expect(doacoesMonetariasServiceMock.createDoacaoMonetaria).not.toHaveBeenCalled();
    });

    it('deve chamar createDoacaoMonetaria e fechar diálogo com sucesso', async () => {
      component.form.patchValue({
        doador: 'Ana Paula',
        telefone: '(51) 98888-7777',
        valor: 350.5,
        data_doacao: '2026-10-24',
        observacoes: 'Campanha de castração',
      });

      const mockCriado: DoacaoMonetaria = {
        id: 99,
        valor: 350.5,
        doador: 'Ana Paula',
        telefone: '51988887777',
        data_doacao: '2026-10-24',
        observacoes: 'Campanha de castração',
        created_at: '2026-10-24T12:00:00Z',
        updated_at: '2026-10-24T12:00:00Z',
      };

      doacoesMonetariasServiceMock.createDoacaoMonetaria.mockResolvedValue(mockCriado);

      await component.onSave();

      expect(doacoesMonetariasServiceMock.createDoacaoMonetaria).toHaveBeenCalledWith({
        doador: 'Ana Paula',
        telefone: '51988887777',
        valor: 350.5,
        data_doacao: '2026-10-24',
        observacoes: 'Campanha de castração',
      });
      expect(dialogRefMock.close).toHaveBeenCalledWith(mockCriado);
    });
  });

  describe('Modo de Edição', () => {
    beforeEach(() => {
      setupTestBed({ doacao: mockDoacaoExistente });
    });

    it('deve inicializar com os dados da doação existente carregados', () => {
      expect(component.isEditing()).toBe(true);
      expect(component.form.controls.doador.value).toBe('Clara Nunes');
      expect(component.form.controls.telefone.value).toBe('(51) 99876-5432');
      expect(component.form.controls.valor.value).toBe(150.0);
      expect(component.form.controls.data_doacao.value).toBe('2026-10-20');
      expect(component.form.controls.observacoes.value).toBe('Contribuição mensal');
      expect(component.form.valid).toBe(true);
    });

    it('deve atualizar doação com updateDoacaoMonetaria e fechar o diálogo', async () => {
      component.form.patchValue({
        valor: 200.0,
      });

      const mockAtualizado: DoacaoMonetaria = {
        ...mockDoacaoExistente,
        valor: 200.0,
      };

      doacoesMonetariasServiceMock.updateDoacaoMonetaria.mockResolvedValue(mockAtualizado);

      await component.onSave();

      expect(doacoesMonetariasServiceMock.updateDoacaoMonetaria).toHaveBeenCalledWith(10, {
        doador: 'Clara Nunes',
        telefone: '51998765432',
        valor: 200.0,
        data_doacao: '2026-10-20',
        observacoes: 'Contribuição mensal',
      });
      expect(dialogRefMock.close).toHaveBeenCalledWith(mockAtualizado);
    });
  });
});
