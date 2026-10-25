import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DespesaDetalhesDialogComponent,
  DespesaDetalhesDialogData,
} from './despesa-detalhes-dialog';
import { Despesa } from '../../models/despesa.model';
import { AuthService } from '@core/auth/services/auth.service';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';
import { ToastService } from '@core/services/toast.service';

describe('DespesaDetalhesDialogComponent', () => {
  let component: DespesaDetalhesDialogComponent;
  let fixture: ComponentFixture<DespesaDetalhesDialogComponent>;

  const mockDespesa: Despesa = {
    id: 105,
    descricao: 'Compra de Medicamentos Especiais',
    categoria: 'Medicamentos & Insumos Gerais',
    valor: 350.5,
    data_despesa: '2026-05-18',
    favorecido: 'Farmácia Veterinária São Francisco',
    telefone: '51988887777',
    observacoes: 'Receitado pelo Dr. Lucas para tratamento dermatológico.',
    id_pet: 1,
    pet: {
      id: 1,
      nome: 'Thor',
      tipo_pet: 'Cachorro',
    },
    created_at: '2026-05-18T10:00:00Z',
    created_by: 'user-1',
  };

  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockAuthService = {
    isAdmin: () => true,
  };

  const mockAuditResolver = {
    resolveUser: vi.fn().mockResolvedValue(null),
  };

  const mockToast = {
    error: vi.fn(),
    success: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [DespesaDetalhesDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { despesa: mockDespesa, isAdmin: true } as DespesaDetalhesDialogData,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditResolverService, useValue: mockAuditResolver },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DespesaDetalhesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e exibir detalhes completos da despesa', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('ID #105');
    expect(compiled.textContent).toContain('Compra de Medicamentos Especiais');
    expect(compiled.textContent).toContain('Medicamentos & Insumos Gerais');
    expect(compiled.textContent).toContain('Farmácia Veterinária São Francisco');
    expect(compiled.textContent).toContain('(51) 98888-7777');
    expect(compiled.textContent).toContain('Thor');
    expect(compiled.textContent).toContain(
      'Receitado pelo Dr. Lucas para tratamento dermatológico.',
    );
  });

  it('deve fechar a modal ao clicar em fechar', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalledWith('close');
  });

  it('deve fechar a modal com ação edit ao clicar em editar', () => {
    component.onEdit();
    expect(mockDialogRef.close).toHaveBeenCalledWith('edit');
  });

  it('deve exibir indicação de gasto institucional quando não houver pet vinculado', async () => {
    const despesaSemPet: Despesa = {
      ...mockDespesa,
      id_pet: null,
      pet: null,
      observacoes: null,
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DespesaDetalhesDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { despesa: despesaSemPet, isAdmin: true } as DespesaDetalhesDialogData,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditResolverService, useValue: mockAuditResolver },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();

    const altFixture = TestBed.createComponent(DespesaDetalhesDialogComponent);
    altFixture.detectChanges();

    const compiled = altFixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Institucional / Geral da ONG');
    expect(compiled.textContent).toContain('Nenhuma observação ou justificativa adicional');
  });
});
