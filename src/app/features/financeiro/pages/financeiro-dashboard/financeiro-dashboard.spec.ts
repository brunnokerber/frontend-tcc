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

  it('deve inicializar carregando apenas fluxo de caixa (otimização: sem fetchDespesas na aba 0)', () => {
    expect(mockFinanceiroService.carregarFluxoCaixa).toHaveBeenCalled();
    expect(mockDespesasService.fetchDespesas).not.toHaveBeenCalled();
    expect(component.balanco().totalEntradas).toBe(5000);
    expect(component.periodoLabel()).toContain('Mês Atual');
  });

  it('deve carregar despesas sob demanda ao alternar para a aba de despesas (index 1)', async () => {
    await component.onTabChange(1);
    expect(component.selectedTabIndex()).toBe(1);
    expect(mockDespesasService.fetchDespesas).toHaveBeenCalledTimes(1);

    // Se chamar novamente para a mesma aba com o mesmo filtro, não repete requisição
    await component.onTabChange(1);
    expect(mockDespesasService.fetchDespesas).toHaveBeenCalledTimes(1);
  });

  it('deve selecionar um período predefinido e atualizar despesas se a aba 1 estiver ativa', async () => {
    await component.onTabChange(1);
    mockDespesasService.fetchDespesas.mockClear();

    await component.selecionarPeriodo('ultimo_mes');
    expect(mockFinanceiroService.aplicarFiltro).toHaveBeenCalledWith('ultimo_mes');
    expect(mockDespesasService.fetchDespesas).toHaveBeenCalled();
  });

  it('não deve disparar fetchDespesas ao selecionar período se a aba ativa for a visão geral (index 0)', async () => {
    component.selectedTabIndex.set(0);
    mockDespesasService.fetchDespesas.mockClear();

    await component.selecionarPeriodo('trimestre');
    expect(mockFinanceiroService.aplicarFiltro).toHaveBeenCalledWith('trimestre');
    expect(mockDespesasService.fetchDespesas).not.toHaveBeenCalled();
  });

  it('deve aplicar filtro customizado e atualizar despesas se a aba 1 estiver ativa', async () => {
    await component.onTabChange(1);
    mockDespesasService.fetchDespesas.mockClear();

    component.customInicio.set(new Date('2026-10-01T12:00:00Z'));
    component.customFim.set(new Date('2026-10-25T12:00:00Z'));
    await component.aplicarFiltroCustomizado();

    expect(mockFinanceiroService.aplicarFiltro).toHaveBeenCalledWith(
      'customizado',
      '2026-10-01',
      '2026-10-25',
    );
    expect(mockDespesasService.fetchDespesas).toHaveBeenCalledWith({
      dataInicio: '2026-10-01',
      dataFim: '2026-10-25',
    });
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
