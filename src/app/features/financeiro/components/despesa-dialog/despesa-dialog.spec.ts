import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DespesaDialogComponent, DespesaDialogData } from './despesa-dialog';
import { DespesasService } from '../../services/despesas.service';
import { PetsService } from '../../../pets/services/pets.service';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { Pet } from '../../../pets/models/pet.model';

describe('DespesaDialogComponent', () => {
  let component: DespesaDialogComponent;
  let fixture: ComponentFixture<DespesaDialogComponent>;

  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockDespesasService = {
    createDespesa: vi.fn(),
    updateDespesa: vi.fn(),
    deleteDespesa: vi.fn(),
  };

  const mockPetsService = {
    fetchPets: vi.fn().mockResolvedValue([
      { id: 10, nome: 'Bob' },
      { id: 20, nome: 'Luna' },
    ] as Pet[]),
  };

  const mockAuthService = {
    isAdmin: signal(true),
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  const mockMatDialog = {
    open: vi.fn(),
  };

  const setupComponent = async (data: DespesaDialogData | null) => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [DespesaDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNativeDateAdapter(),
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: DespesasService, useValue: mockDespesasService },
        { provide: PetsService, useValue: mockPetsService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
        { provide: MatDialog, useValue: mockMatDialog },
      ],
    })
      .overrideComponent(DespesaDialogComponent, {
        add: {
          providers: [{ provide: MatDialog, useValue: mockMatDialog }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DespesaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Quando aberto no contexto de um Pet Específico (id_pet predefinido)', () => {
    beforeEach(async () => {
      await setupComponent({
        id_pet: 67,
        pet: { id: 67, nome: 'Simba' },
      });
    });

    it('deve bloquear o campo id_pet e marcar isPetLocked como true', () => {
      expect(component.isPetLocked()).toBe(true);
      expect(component.form.controls.id_pet.disabled).toBe(true);
      expect(component.form.controls.id_pet.value).toBe(67);
      expect(component.petsDisponiveis()).toEqual([{ id: 67, nome: 'Simba' }]);
    });

    it('NÃO deve chamar fetchPets (zero requisições de listagem de pets)', () => {
      expect(mockPetsService.fetchPets).not.toHaveBeenCalled();
    });

    it('deve submeter o formulário mantendo o id_pet fixo via getRawValue', async () => {
      mockDespesasService.createDespesa.mockResolvedValueOnce({ id: 1, descricao: 'Ração' });

      component.form.patchValue({
        descricao: 'Ração Premium para Simba',
        categoria: 'Alimentação & Suplementos',
        valor: 150.0,
        favorecido: 'Pet Shop Rações',
      });

      await component.onSubmit();

      expect(mockDespesasService.createDespesa).toHaveBeenCalledWith(
        expect.objectContaining({
          id_pet: 67,
          descricao: 'Ração Premium para Simba',
          categoria: 'Alimentação & Suplementos',
          valor: 150.0,
          favorecido: 'Pet Shop Rações',
        }),
      );
      expect(mockDialogRef.close).toHaveBeenCalledWith({
        action: 'saved',
        despesa: { id: 1, descricao: 'Ração' },
      });
    });
  });

  describe('Quando aberto sem pet específico (despesa geral da ONG)', () => {
    beforeEach(async () => {
      await setupComponent(null);
    });

    it('deve manter o campo id_pet editável e isPetLocked como false', () => {
      expect(component.isPetLocked()).toBe(false);
      expect(component.form.controls.id_pet.enabled).toBe(true);
      expect(component.form.controls.id_pet.value).toBeNull();
    });

    it('deve carregar a lista de pets para seleção opcional via fetchPets', () => {
      expect(mockPetsService.fetchPets).toHaveBeenCalledTimes(1);
      expect(component.petsDisponiveis()).toEqual([
        { id: 10, nome: 'Bob' },
        { id: 20, nome: 'Luna' },
      ]);
    });
  });
});
