import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MovimentacaoFluxoCaixa } from '@features/financeiro/models/fluxo-caixa.model';
import { FinanceiroService } from '@features/financeiro/services/financeiro.service';
import { beforeEach, describe, expect, it } from 'vitest';
import { FinanceiroFluxoTabComponent } from './financeiro-fluxo-tab';

describe('FinanceiroFluxoTabComponent', () => {
  let fixture: ComponentFixture<FinanceiroFluxoTabComponent>;
  let component: FinanceiroFluxoTabComponent;

  const mockMovimentacoes: MovimentacaoFluxoCaixa[] = [
    {
      tipo_movimentacao: 'Entrada',
      categoria: 'Doação Financeira',
      valor: 1500,
      data_movimentacao: '2026-10-15',
      pessoa_referencia: 'Doador Solidário',
      observacoes: 'Doação PIX',
      id_pet: null,
      created_at: '2026-10-15T12:00:00Z',
    },
    {
      tipo_movimentacao: 'Saída',
      categoria: 'Alimentação / Ração',
      valor: 350,
      data_movimentacao: '2026-10-16',
      pessoa_referencia: 'Agropecuária Vale',
      observacoes: 'Ração especial',
      id_pet: 1,
      created_at: '2026-10-16T14:00:00Z',
    },
  ];

  const mockFinanceiroService = {
    evolucaoMensal: signal([{ chave: '2026-10', label: 'Out/26', entradas: 1500, saidas: 350 }]),
    despesasPorCategoria: signal([
      { categoria: 'Alimentação / Ração', total: 350, quantidade: 1, percentual: 100 },
    ]),
    topPetsCusto: signal([
      { id_pet: 1, nome_pet: 'Rex', totalGasto: 350, quantidadeProcedimentos: 1 },
    ]),
    movimentacoes: signal(mockMovimentacoes),
    loading: signal(false),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FinanceiroFluxoTabComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: FinanceiroService, useValue: mockFinanceiroService },
      ],
    });

    fixture = TestBed.createComponent(FinanceiroFluxoTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e exibir os dados de movimentações e gráficos', () => {
    expect(component.movimentacoes().length).toBe(2);
    expect(component.pagedMovimentacoes().length).toBe(2);
    expect(component.chartMaxVal()).toBeGreaterThan(1000);
  });

  it('deve calcular corretamente coordenadas e alturas SVG', () => {
    const barHeight = component.getBarHeight(1500);
    expect(barHeight).toBeGreaterThan(0);

    const barY = component.getBarY(1500);
    expect(barY).toBeLessThan(component.svgDimensions.height);

    const monthX = component.getMonthX(0, 1);
    expect(monthX).toBeGreaterThan(component.svgDimensions.padding);
  });

  it('deve responder à mudança de página da tabela de movimentações', () => {
    component.onPageChangeMov({ pageIndex: 1, pageSize: 25, length: 50 });
    expect(component.pageIndexMov()).toBe(1);
    expect(component.pageSizeMov()).toBe(25);
  });
});
