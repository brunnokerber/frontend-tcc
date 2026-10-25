import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { Despesa } from '@features/financeiro/models/despesa.model';
import { DespesasService } from '@features/financeiro/services/despesas.service';
import { FinanceiroService } from '@features/financeiro/services/financeiro.service';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceiroDespesasTabComponent } from './financeiro-despesas-tab';

describe('FinanceiroDespesasTabComponent', () => {
  let fixture: ComponentFixture<FinanceiroDespesasTabComponent>;
  let component: FinanceiroDespesasTabComponent;

  const mockDespesas: Despesa[] = [
    {
      id: 1,
      descricao: 'Compra de Medicamentos',
      categoria: 'Medicamentos & Insumos Gerais',
      valor: 250.0,
      data_despesa: '2026-10-18',
      favorecido: 'Farmácia Veterinária Pets',
      telefone: '51988880000',
      observacoes: 'Antibióticos',
      id_pet: null,
      created_at: '2026-10-18T10:00:00Z',
      updated_at: '2026-10-18T10:00:00Z',
    },
    {
      id: 2,
      descricao: 'Sacos de Ração Filhotes',
      categoria: 'Alimentação / Ração',
      valor: 400.0,
      data_despesa: '2026-10-20',
      favorecido: 'Distribuidora Pet Ltda',
      telefone: null,
      observacoes: null,
      id_pet: null,
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:00:00Z',
    },
  ];

  const mockDespesasService = {
    despesas: signal(mockDespesas),
    loading: signal(false),
    fetchDespesas: vi.fn().mockResolvedValue(mockDespesas),
    deleteDespesa: vi.fn().mockResolvedValue(true),
  };

  const mockFinanceiroService = {
    filtro: signal({
      tipo: 'mes_atual',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    }),
  };

  const mockAuthService = {
    isAdmin: signal(true),
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  const mockDialog = {
    open: vi.fn().mockReturnValue({
      afterClosed: () => of(true),
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FinanceiroDespesasTabComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DespesasService, useValue: mockDespesasService },
        { provide: FinanceiroService, useValue: mockFinanceiroService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToast },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).overrideComponent(FinanceiroDespesasTabComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: mockDialog }],
      },
    });

    fixture = TestBed.createComponent(FinanceiroDespesasTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e exibir a lista filtrada de despesas', () => {
    expect(component.despesas().length).toBe(2);
    expect(component.filteredDespesas().length).toBe(2);
    expect(component.pagedDespesas().length).toBe(2);
  });

  it('deve filtrar despesas respeitando o período de datas ativo do FinanceiroService', () => {
    // mockDespesas possui data 2026-10-18 e 2026-10-20
    mockFinanceiroService.filtro.set({
      tipo: 'customizado',
      dataInicio: '2026-10-19',
      dataFim: '2026-10-25',
    });

    // Apenas a despesa do dia 2026-10-20 deve permanecer
    expect(component.filteredDespesas().length).toBe(1);
    expect(component.filteredDespesas()[0].data_despesa).toBe('2026-10-20');

    // Restaura o filtro do mês
    mockFinanceiroService.filtro.set({
      tipo: 'mes_atual',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    });
    expect(component.filteredDespesas().length).toBe(2);
  });

  it('deve filtrar despesas por texto de busca', () => {
    component.searchTermDespesas.set('Medicamentos');
    expect(component.filteredDespesas().length).toBe(1);
    expect(component.filteredDespesas()[0].descricao).toBe('Compra de Medicamentos');
  });

  it('deve filtrar despesas por categoria', () => {
    component.selectedCategoriaDespesas.set('Alimentação / Ração');
    expect(component.filteredDespesas().length).toBe(1);
    expect(component.filteredDespesas()[0].categoria).toBe('Alimentação / Ração');
  });

  it('deve limpar os filtros de despesa', () => {
    component.searchTermDespesas.set('Busca');
    component.selectedCategoriaDespesas.set('Alimentação / Ração');
    component.pageIndexDesp.set(2);

    component.limparFiltroDespesas();

    expect(component.searchTermDespesas()).toBe('');
    expect(component.selectedCategoriaDespesas()).toBe('');
    expect(component.pageIndexDesp()).toBe(0);
  });

  it('deve abrir modal de edição de despesa', () => {
    component.openEditarDespesa(mockDespesas[0]);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('deve abrir modal de detalhes da despesa', () => {
    component.openDetalhesDespesa(mockDespesas[0]);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('deve permitir exclusão de despesa quando usuário for admin', () => {
    component.confirmDeleteDespesa(mockDespesas[0]);
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockDespesasService.deleteDespesa).toHaveBeenCalledWith(1);
  });
});
