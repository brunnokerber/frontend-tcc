import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { BalancoFinanceiro, FiltroPeriodo } from '@features/financeiro/models/fluxo-caixa.model';
import { DespesasService } from '@features/financeiro/services/despesas.service';
import { FinanceiroReportService } from '@features/financeiro/services/financeiro-report.service';
import { FinanceiroService } from '@features/financeiro/services/financeiro.service';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FinanceiroDashboardComponent from './financeiro-dashboard';

describe('FinanceiroDashboardComponent', () => {
  let fixture: ComponentFixture<FinanceiroDashboardComponent>;
  let component: FinanceiroDashboardComponent;

  const mockBalanco: BalancoFinanceiro = {
    totalEntradas: 5000,
    totalSaidas: 2000,
    saldoLiquido: 3000,
    taxaCobertura: 250,
  };

  const mockFinanceiroService = {
    filtro: signal<FiltroPeriodo>({
      tipo: 'mes_atual',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    }),
    balanco: signal(mockBalanco),
    despesasPorCategoria: signal([]),
    evolucaoMensal: signal([]),
    topPetsCusto: signal([]),
    movimentacoes: signal([]),
    loading: signal(false),
    carregarFluxoCaixa: vi.fn().mockResolvedValue(undefined),
    aplicarFiltro: vi.fn().mockResolvedValue(undefined),
  };

  const mockDespesasService = {
    despesas: signal([]),
    loading: signal(false),
    fetchDespesas: vi.fn().mockResolvedValue([]),
  };

  const mockReportService = {
    printBalancetePdf: vi.fn(),
    exportToCsv: vi.fn(),
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
      imports: [FinanceiroDashboardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: FinanceiroService, useValue: mockFinanceiroService },
        { provide: DespesasService, useValue: mockDespesasService },
        { provide: FinanceiroReportService, useValue: mockReportService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToast },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).overrideComponent(FinanceiroDashboardComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: mockDialog }],
      },
    });

    fixture = TestBed.createComponent(FinanceiroDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e carregar dados contábeis', () => {
    expect(mockFinanceiroService.carregarFluxoCaixa).toHaveBeenCalled();
    expect(mockDespesasService.fetchDespesas).toHaveBeenCalled();
    expect(component.balanco().totalEntradas).toBe(5000);
    expect(component.periodoLabel()).toContain('Mês Atual');
  });

  it('deve selecionar um período predefinido', async () => {
    await component.selecionarPeriodo('ultimo_mes');
    expect(mockFinanceiroService.aplicarFiltro).toHaveBeenCalledWith('ultimo_mes');
  });

  it('deve abrir modal para registrar nova despesa', () => {
    component.openNovaDespesaDialog();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('deve acionar serviço de exportação de PDF e CSV', () => {
    component.exportarPdf();
    expect(mockReportService.printBalancetePdf).toHaveBeenCalled();

    component.exportarCsv();
    expect(mockReportService.exportToCsv).toHaveBeenCalled();
  });
});
