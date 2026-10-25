import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { DespesaDialogComponent } from '@features/financeiro/components/despesa-dialog/despesa-dialog';
import { TipoPeriodoFiltro } from '@features/financeiro/models/fluxo-caixa.model';
import { DespesasService } from '@features/financeiro/services/despesas.service';
import { FinanceiroReportService } from '@features/financeiro/services/financeiro-report.service';
import { FinanceiroService } from '@features/financeiro/services/financeiro.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header';
import { StatCardComponent } from '@shared/components/stat-card/stat-card';
import { DateMaskDirective } from '@shared/directives/date-mask.directive';
import { dateToIsoString } from '@shared/utils/string-utils';
import { FinanceiroDespesasTabComponent } from './tabs/financeiro-despesas-tab/financeiro-despesas-tab';
import { FinanceiroFluxoTabComponent } from './tabs/financeiro-fluxo-tab/financeiro-fluxo-tab';

@Component({
  selector: 'app-financeiro-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    PageHeaderComponent,
    StatCardComponent,
    DateMaskDirective,
    FinanceiroFluxoTabComponent,
    FinanceiroDespesasTabComponent,
  ],
  templateUrl: './financeiro-dashboard.html',
  styleUrls: ['./financeiro-dashboard.scss'],
})
export default class FinanceiroDashboardComponent implements OnInit {
  public financeiroService = inject(FinanceiroService);
  public despesasService = inject(DespesasService);
  public reportService = inject(FinanceiroReportService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  @ViewChild('fluxoTab') fluxoTab?: FinanceiroFluxoTabComponent;
  @ViewChild('despesasTab') despesasTab?: FinanceiroDespesasTabComponent;

  public isAdmin = this.authService.isAdmin;

  // Estado dos Filtros Globais
  public filtro = this.financeiroService.filtro;
  public customInicio = signal<Date | null>(null);
  public customFim = signal<Date | null>(null);

  // Dados consolidados para os cards superiores
  public balanco = this.financeiroService.balanco;
  public despesasPorCategoria = this.financeiroService.despesasPorCategoria;
  public evolucaoMensal = this.financeiroService.evolucaoMensal;
  public topPetsCusto = this.financeiroService.topPetsCusto;
  public movimentacoes = this.financeiroService.movimentacoes;
  public loadingFluxo = this.financeiroService.loading;

  public periodoLabel = computed<string>(() => {
    const f = this.filtro();
    const formatBr = (d: string) => {
      const parts = d.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
    };

    switch (f.tipo) {
      case 'mes_atual':
        return `Mês Atual (${formatBr(f.dataInicio)} a ${formatBr(f.dataFim)})`;
      case 'ultimo_mes':
        return `Mês Anterior (${formatBr(f.dataInicio)} a ${formatBr(f.dataFim)})`;
      case 'trimestre':
        return `Últimos 90 Dias (${formatBr(f.dataInicio)} a ${formatBr(f.dataFim)})`;
      case 'ano':
        return `Ano Vigente (${formatBr(f.dataInicio)} a ${formatBr(f.dataFim)})`;
      default:
        return `Personalizado (${formatBr(f.dataInicio)} a ${formatBr(f.dataFim)})`;
    }
  });

  async ngOnInit(): Promise<void> {
    await this.carregarDados();
  }

  async carregarDados(): Promise<void> {
    await Promise.all([
      this.financeiroService.carregarFluxoCaixa(),
      this.despesasService.fetchDespesas(),
    ]);
  }

  async selecionarPeriodo(tipo: TipoPeriodoFiltro): Promise<void> {
    if (tipo !== 'customizado') {
      if (this.fluxoTab) {
        this.fluxoTab.pageIndexMov.set(0);
      }
      await this.financeiroService.aplicarFiltro(tipo);
    }
  }

  async aplicarFiltroCustomizado(): Promise<void> {
    const ini = this.customInicio();
    const fim = this.customFim();

    if (!ini || !fim) {
      this.toast.error('Informe a data de início e fim para o período personalizado.');
      return;
    }

    if (ini > fim) {
      this.toast.error('A data inicial não pode ser superior à data final.');
      return;
    }

    if (this.fluxoTab) {
      this.fluxoTab.pageIndexMov.set(0);
    }
    const dataInicioStr = dateToIsoString(ini);
    const dataFimStr = dateToIsoString(fim);

    if (dataInicioStr && dataFimStr) {
      await this.financeiroService.aplicarFiltro('customizado', dataInicioStr, dataFimStr);
    }
  }

  openNovaDespesaDialog(): void {
    const ref = this.dialog.open(DespesaDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
    });

    ref.afterClosed().subscribe(async (salvou: boolean) => {
      if (salvou) {
        await this.carregarDados();
      }
    });
  }

  exportarPdf(): void {
    const movs = this.movimentacoes();
    const bal = this.balanco();
    const cats = this.despesasPorCategoria();
    const periodo = this.periodoLabel();

    this.reportService.printBalancetePdf(movs, bal, cats, periodo);
  }

  exportarCsv(): void {
    const movs = this.movimentacoes();
    const bal = this.balanco();
    const periodo = this.periodoLabel();

    this.reportService.exportToCsv(movs, bal, periodo);
  }
}
