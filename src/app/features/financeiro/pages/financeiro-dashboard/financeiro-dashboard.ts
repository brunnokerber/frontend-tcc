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

  // Controle de Aba Ativa e Otimização de Requisições
  public selectedTabIndex = signal<number>(0);
  private despesasCarregadasParaFiltro: string | null = null;

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
    await this.financeiroService.carregarFluxoCaixa();

    // Otimização: Apenas busca despesas detalhadas se a aba de despesas estiver ativa
    if (this.selectedTabIndex() === 1) {
      await this.carregarDespesasSeNecessario(true);
    } else {
      this.despesasCarregadasParaFiltro = null;
    }
  }

  async onTabChange(index: number): Promise<void> {
    this.selectedTabIndex.set(index);
    if (index === 1) {
      await this.carregarDespesasSeNecessario();
    }
  }

  async carregarDespesasSeNecessario(
    force = false,
    datas?: { dataInicio: string; dataFim: string },
  ): Promise<void> {
    const f = this.filtro();
    const dataInicio = datas?.dataInicio ?? f.dataInicio;
    const dataFim = datas?.dataFim ?? f.dataFim;
    const filtroKey = `${f.tipo}_${dataInicio}_${dataFim}`;

    if (force || this.despesasCarregadasParaFiltro !== filtroKey) {
      await this.despesasService.fetchDespesas({
        dataInicio,
        dataFim,
      });
      this.despesasCarregadasParaFiltro = filtroKey;
    }
  }

  async selecionarPeriodo(tipo: TipoPeriodoFiltro): Promise<void> {
    if (tipo !== 'customizado') {
      if (this.fluxoTab) {
        this.fluxoTab.pageIndexMov.set(0);
      }
      if (this.despesasTab) {
        this.despesasTab.pageIndexDesp.set(0);
      }
      await this.financeiroService.aplicarFiltro(tipo);

      // Otimização: Apenas executa requisição HTTP de despesas se a aba ativa for a de despesas
      if (this.selectedTabIndex() === 1) {
        await this.carregarDespesasSeNecessario(true);
      } else {
        this.despesasCarregadasParaFiltro = null;
      }
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
    if (this.despesasTab) {
      this.despesasTab.pageIndexDesp.set(0);
    }
    const dataInicioStr = dateToIsoString(ini);
    const dataFimStr = dateToIsoString(fim);

    if (dataInicioStr && dataFimStr) {
      await this.financeiroService.aplicarFiltro('customizado', dataInicioStr, dataFimStr);

      // Otimização: Apenas executa requisição HTTP de despesas se a aba ativa for a de despesas
      if (this.selectedTabIndex() === 1) {
        await this.carregarDespesasSeNecessario(true, {
          dataInicio: dataInicioStr,
          dataFim: dataFimStr,
        });
      } else {
        this.despesasCarregadasParaFiltro = null;
      }
    }
  }

  openNovaDespesaDialog(): void {
    const ref = this.dialog.open(DespesaDialogComponent, {
      width: '880px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      disableClose: true,
      autoFocus: false,
    });

    ref.afterClosed().subscribe(async (res) => {
      if (res) {
        await this.financeiroService.carregarFluxoCaixa();
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
