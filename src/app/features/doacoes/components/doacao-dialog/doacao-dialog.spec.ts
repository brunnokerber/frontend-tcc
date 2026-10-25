import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';
import { ToastService } from '@core/services/toast.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Doacao } from '../../models/doacao.model';
import { DoacoesService } from '../../services/doacoes.service';
import { DoacaoDialogComponent, DoacaoDialogData } from './doacao-dialog';

describe('DoacaoDialogComponent', () => {
  let fixture: ComponentFixture<DoacaoDialogComponent>;
  let component: DoacaoDialogComponent;

  let dialogRefMock: { close: ReturnType<typeof vi.fn> };
  let doacoesServiceMock: {
    createDoacao: ReturnType<typeof vi.fn>;
    updateDoacao: ReturnType<typeof vi.fn>;
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let dialogData: DoacaoDialogData;

  const mockDoacaoExistente: Doacao = {
    id: 15,
    tipo_doacao: 'Ração',
    volume: 50,
    unidade_medida: 'kg',
    doador: 'Agropecuária Amigo Fiel',
    telefone: '51988887777',
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-24T10:00:00Z',
  };

  const setupTestBed = (data: DoacaoDialogData = {}) => {
    dialogRefMock = { close: vi.fn() };
    doacoesServiceMock = {
      createDoacao: vi.fn(),
      updateDoacao: vi.fn(),
    };
    toastMock = { success: vi.fn(), error: vi.fn() };
    dialogData = data;

    TestBed.configureTestingModule({
      imports: [DoacaoDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: DoacoesService, useValue: doacoesServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: AuthService, useValue: { isAdmin: () => true } },
        {
          provide: AuditResolverService,
          useValue: { resolveUser: vi.fn().mockResolvedValue(null) },
        },
      ],
    });

    fixture = TestBed.createComponent(DoacaoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Modo de Criação (Nova Doação)', () => {
    beforeEach(() => {
      setupTestBed({});
    });

    it('deve inicializar com formulário vazio e modo de criação ativado', () => {
      expect(component.isEditing()).toBe(false);
      expect(component.doacaoForm.controls.tipo_doacao.value).toBe('');
      expect(component.doacaoForm.controls.doador.value).toBe('');
      expect(component.doacaoForm.controls.volume.value).toBeNull();
      expect(component.doacaoForm.controls.unidade_medida.value).toBe('kg');
      expect(component.doacaoForm.invalid).toBe(true);
    });

    it('deve permitir selecionar tipo_doacao via sugestões rápidas', () => {
      component.setTipoDoacao('Medicamento');
      expect(component.doacaoForm.controls.tipo_doacao.value).toBe('Medicamento');
      expect(component.doacaoForm.controls.tipo_doacao.dirty).toBe(true);
      expect(component.tipoDoacaoQuery()).toBe('Medicamento');
    });

    it('deve permitir selecionar unidade_medida via sugestões rápidas', () => {
      component.setUnidade('litros');
      expect(component.doacaoForm.controls.unidade_medida.value).toBe('litros');
      expect(component.doacaoForm.controls.unidade_medida.dirty).toBe(true);
    });

    it('deve filtrar a lista de sugestões de tipo_doacao conforme digitação', () => {
      component.onTipoDoacaoInput({
        target: { value: 'limp' },
      } as unknown as Event);

      const filtered = component.filteredTiposDoacao();
      expect(filtered).toContain('Material de Limpeza');
      expect(filtered).not.toContain('Ração');
    });

    it('deve bloquear submissão e exibir toast se o formulário for inválido', async () => {
      await component.onSave();

      expect(component.doacaoForm.touched).toBe(true);
      expect(toastMock.error).toHaveBeenCalledWith('Preencha os campos obrigatórios corretamente.');
      expect(doacoesServiceMock.createDoacao).not.toHaveBeenCalled();
    });

    it('deve criar doação com sucesso e fechar modal ao preencher campos obrigatórios', async () => {
      doacoesServiceMock.createDoacao.mockResolvedValue({
        id: 1,
        tipo_doacao: 'Ração',
        doador: 'Pedro Alvares',
        telefone: '51999991111',
        volume: 25.5,
        unidade_medida: 'kg',
      });

      component.doacaoForm.setValue({
        tipo_doacao: 'Ração',
        doador: 'Pedro Alvares',
        telefone: '(51) 99999-1111',
        volume: 25.5,
        unidade_medida: 'kg',
      });

      await component.onSave();

      expect(doacoesServiceMock.createDoacao).toHaveBeenCalledWith({
        tipo_doacao: 'Ração',
        doador: 'Pedro Alvares',
        telefone: '51999991111',
        volume: 25.5,
        unidade_medida: 'kg',
      });
      expect(dialogRefMock.close).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, tipo_doacao: 'Ração' }),
      );
    });
  });

  describe('Modo de Edição (Atualizar Doação Existente)', () => {
    beforeEach(() => {
      setupTestBed({ doacao: mockDoacaoExistente });
    });

    it('deve pré-carregar os dados da doação no formulário e ativar modo de edição', () => {
      expect(component.isEditing()).toBe(true);
      expect(component.doacaoForm.controls.tipo_doacao.value).toBe('Ração');
      expect(component.doacaoForm.controls.doador.value).toBe('Agropecuária Amigo Fiel');
      expect(component.doacaoForm.controls.volume.value).toBe(50);
      expect(component.doacaoForm.controls.unidade_medida.value).toBe('kg');
      expect(component.doacaoForm.controls.telefone.value).toBe('(51) 98888-7777');
      expect(component.doacaoForm.valid).toBe(true);
    });

    it('deve atualizar doação com sucesso e fechar modal', async () => {
      doacoesServiceMock.updateDoacao.mockResolvedValue({
        ...mockDoacaoExistente,
        tipo_doacao: 'Acessórios',
        volume: 60,
      });

      component.setTipoDoacao('Acessórios');
      component.doacaoForm.controls.volume.setValue(60);

      await component.onSave();

      expect(doacoesServiceMock.updateDoacao).toHaveBeenCalledWith(
        15,
        expect.objectContaining({
          tipo_doacao: 'Acessórios',
          volume: 60,
          unidade_medida: 'kg',
        }),
      );
      expect(dialogRefMock.close).toHaveBeenCalled();
    });
  });

  describe('Cancelamento', () => {
    it('deve fechar o modal com null ao cancelar', () => {
      setupTestBed({});
      component.onCancel();
      expect(dialogRefMock.close).toHaveBeenCalledWith(null);
    });
  });
});
