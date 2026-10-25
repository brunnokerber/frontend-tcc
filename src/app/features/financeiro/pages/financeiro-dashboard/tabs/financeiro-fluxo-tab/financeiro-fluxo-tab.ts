import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { MovimentacaoFluxoCaixa } from '@features/financeiro/models/fluxo-caixa.model';
import { FinanceiroService } from '@features/financeiro/services/financeiro.service';

@Component({
  selector: 'app-financeiro-fluxo-tab',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './financeiro-fluxo-tab.html',
  styleUrls: ['./financeiro-fluxo-tab.scss'],
})
export class FinanceiroFluxoTabComponent {
  public financeiroService = inject(FinanceiroService);

  public evolucaoMensal = this.financeiroService.evolucaoMensal;
  public despesasPorCategoria = this.financeiroService.despesasPorCategoria;
  public topPetsCusto = this.financeiroService.topPetsCusto;
  public movimentacoes = this.financeiroService.movimentacoes;
  public loadingFluxo = this.financeiroService.loading;

  // Paginação dos Lançamentos
  public pageIndexMov = signal<number>(0);
  public pageSizeMov = signal<number>(10);

  public pagedMovimentacoes = computed<MovimentacaoFluxoCaixa[]>(() => {
    const all = this.movimentacoes();
    const start = this.pageIndexMov() * this.pageSizeMov();
    return all.slice(start, start + this.pageSizeMov());
  });

  // Dimensões e helpers SVG
  public readonly svgDimensions = { width: 620, height: 260, padding: 40 };

  public chartMaxVal = computed<number>(() => {
    const meses = this.evolucaoMensal();
    if (!meses || meses.length === 0) return 1000;
    let max = 0;
    for (const m of meses) {
      if (m.entradas > max) max = m.entradas;
      if (m.saidas > max) max = m.saidas;
    }
    return max > 0 ? Math.ceil(max * 1.15) : 1000;
  });

  onPageChangeMov(event: PageEvent): void {
    this.pageIndexMov.set(event.pageIndex);
    this.pageSizeMov.set(event.pageSize);
  }

  getBarHeight(val: number): number {
    const max = this.chartMaxVal();
    const usableHeight = this.svgDimensions.height - this.svgDimensions.padding * 1.8;
    return max > 0 ? (val / max) * usableHeight : 0;
  }

  getBarY(val: number): number {
    const height = this.getBarHeight(val);
    const bottomY = this.svgDimensions.height - this.svgDimensions.padding;
    return bottomY - height;
  }

  getMonthX(index: number, total: number): number {
    const usableWidth = this.svgDimensions.width - this.svgDimensions.padding * 2;
    const step = usableWidth / Math.max(total, 1);
    return this.svgDimensions.padding + index * step + step / 2;
  }
}
