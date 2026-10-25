import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { LocaisService } from '@features/locais/services/locais.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { PageHeaderComponent } from '@shared/components/page-header/page-header';
import { formatPhone, onlyDigits } from '@shared/utils/string-utils';
import {
  DirecionamentoDialogComponent,
  DirecionamentoDialogData,
} from '../../components/direcionamento-dialog/direcionamento-dialog';
import {
  DoacaoDialogComponent,
  DoacaoDialogData,
} from '../../components/doacao-dialog/doacao-dialog';
import {
  DoacaoMonetariaDialogComponent,
  DoacaoMonetariaDialogData,
} from '../../components/doacao-monetaria-dialog/doacao-monetaria-dialog';
import { DirecionamentoDoacao, Doacao } from '../../models/doacao.model';
import {
  DOACAO_MONETARIA_SEARCH_FIELDS,
  DoacaoMonetaria,
  DoacaoMonetariaFilter,
  formatCurrencyBRL,
} from '../../models/doacao-monetaria.model';
import { DoacoesService } from '../../services/doacoes.service';
import { DoacoesMonetariasService } from '../../services/doacoes-monetarias.service';
import { DoacoesDirecionamentosTabComponent } from './tabs/doacoes-direcionamentos-tab/doacoes-direcionamentos-tab';
import { DoacoesInsumosTabComponent } from './tabs/doacoes-insumos-tab/doacoes-insumos-tab';
import { DoacoesMonetariasTabComponent } from './tabs/doacoes-monetarias-tab/doacoes-monetarias-tab';

@Component({
  selector: 'app-doacao-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDialogModule,
    DoacoesInsumosTabComponent,
    DoacoesMonetariasTabComponent,
    DoacoesDirecionamentosTabComponent,
  ],
  templateUrl: './doacao-list.html',
  styleUrls: ['./doacao-list.scss'],
})
export default class DoacaoListComponent implements OnInit {
  public doacoesService = inject(DoacoesService);
  public doacoesMonetariasService = inject(DoacoesMonetariasService);
  public authService = inject(AuthService);
  private locaisService = inject(LocaisService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  @ViewChild('insumosTab') insumosTab?: DoacoesInsumosTabComponent;
  @ViewChild('monetariaTab') monetariaTab?: DoacoesMonetariasTabComponent;
  @ViewChild('direcionamentosTab') direcionamentosTab?: DoacoesDirecionamentosTabComponent;

  public isAdmin = this.authService.isAdmin;

  // Totais computados para o cabeçalho e badges
  public totalDoacoes = computed(() => this.doacoesService.doacoes().length);
  public totalComSaldo = computed(
    () => this.doacoesService.doacoes().filter((d) => (d.volume_disponivel ?? 0) > 0).length,
  );
  public totalEsgotadas = computed(
    () => this.doacoesService.doacoes().filter((d) => (d.volume_disponivel ?? 0) <= 0).length,
  );
  public totalDirecionamentos = computed(() => this.doacoesService.direcionamentos().length);
  public totalDoacoesMonetarias = computed(
    () => this.doacoesMonetariasService.doacoesMonetarias().length,
  );

  // Passthroughs para compatibilidade com testes e orquestração
  public searchFieldMonetaria = signal<string>('doador');
  public searchValueMonetaria = signal<string>('');
  public dataInicioMonetaria = signal<string>('');
  public dataFimMonetaria = signal<string>('');
  public searchFieldsMonetaria = DOACAO_MONETARIA_SEARCH_FIELDS;
  public pageIndexMonetaria = signal<number>(0);
  public pageSizeMonetaria = signal<number>(10);
  public expandedRows = signal<Set<number>>(new Set());

  public pagedDoacoesMonetarias = computed(() => {
    const list = this.doacoesMonetariasService.doacoesMonetarias();
    const start = this.pageIndexMonetaria() * this.pageSizeMonetaria();
    return list.slice(start, start + this.pageSizeMonetaria());
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.doacoesService.fetchDoacoes(),
      this.doacoesService.fetchDirecionamentos(),
      this.doacoesMonetariasService.fetchDoacoesMonetarias(),
      this.locaisService.fetchLocais(),
    ]);
  }

  onDataChanged(): void {
    // Sincroniza totais globais se necessário
    this.doacoesService.fetchDoacoes();
    this.doacoesService.fetchDirecionamentos();
    this.doacoesMonetariasService.fetchDoacoesMonetarias();
  }

  onPageChangeMonetaria(event: PageEvent): void {
    this.pageIndexMonetaria.set(event.pageIndex);
    this.pageSizeMonetaria.set(event.pageSize);
    if (this.monetariaTab) {
      this.monetariaTab.onPageChangeMonetaria(event);
    }
  }

  onSearchFieldMonetariaChange(newField: string): void {
    this.searchFieldMonetaria.set(newField);
    this.searchValueMonetaria.set('');
    if (this.monetariaTab) {
      this.monetariaTab.onSearchFieldMonetariaChange(newField);
    }
  }

  getSearchPlaceholderMonetaria(): string {
    const found = this.searchFieldsMonetaria.find((f) => f.value === this.searchFieldMonetaria());
    return found?.placeholder || 'Digite o termo de busca...';
  }

  applyFiltersMonetaria(force = false): void {
    const val = this.searchValueMonetaria().trim();
    const field = this.searchFieldMonetaria();
    const dataInicio = this.dataInicioMonetaria() || undefined;
    const dataFim = this.dataFimMonetaria() || undefined;

    const filterParams: DoacaoMonetariaFilter = {
      searchField: val ? field : undefined,
      searchValue: val || undefined,
      dataInicio,
      dataFim,
    };

    this.pageIndexMonetaria.set(0);
    this.doacoesMonetariasService.fetchDoacoesMonetarias(filterParams);
    if (this.monetariaTab) {
      this.monetariaTab.applyFiltersMonetaria(force);
    }
  }

  clearFiltersMonetaria(): void {
    this.searchValueMonetaria.set('');
    this.searchFieldMonetaria.set('doador');
    this.dataInicioMonetaria.set('');
    this.dataFimMonetaria.set('');
    this.pageIndexMonetaria.set(0);
    this.applyFiltersMonetaria(true);
    if (this.monetariaTab) {
      this.monetariaTab.clearFiltersMonetaria();
    }
  }

  toggleExpandRow(id: number): void {
    const current = new Set(this.expandedRows());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedRows.set(current);
  }

  isRowExpanded(id: number): boolean {
    return this.expandedRows().has(id);
  }

  formatCurrency(val?: number | null): string {
    return formatCurrencyBRL(val);
  }

  formatPhone(phone?: string | null): string {
    return formatPhone(phone);
  }

  getWhatsAppLink(phone?: string | null): string {
    const digits = onlyDigits(phone);
    return `https://wa.me/55${digits}`;
  }

  openDoacaoDialog(doacao?: Doacao): void {
    const dialogRef = this.dialog.open<DoacaoDialogComponent, DoacaoDialogData, Doacao | null>(
      DoacaoDialogComponent,
      {
        width: '600px',
        maxWidth: '96vw',
        disableClose: true,
        autoFocus: false,
        data: {
          doacao: doacao || null,
        },
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.onDataChanged();
      }
    });
  }

  openDirecionarDialog(doacao: Doacao, direcionamento?: DirecionamentoDoacao, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const dialogRef = this.dialog.open<
      DirecionamentoDialogComponent,
      DirecionamentoDialogData,
      DirecionamentoDoacao | null
    >(DirecionamentoDialogComponent, {
      width: '640px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
      data: {
        doacao,
        direcionamento: direcionamento || null,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.onDataChanged();
      }
    });
  }

  openDoacaoMonetariaDialog(doacao?: DoacaoMonetaria): void {
    const dialogRef = this.dialog.open<
      DoacaoMonetariaDialogComponent,
      DoacaoMonetariaDialogData,
      DoacaoMonetaria | null
    >(DoacaoMonetariaDialogComponent, {
      width: '600px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
      data: {
        doacao: doacao || null,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.onDataChanged();
      }
    });
  }

  confirmDeleteDoacaoMonetaria(doacao: DoacaoMonetaria, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!this.isAdmin()) {
      this.toast.error('Apenas administradores possuem permissão para excluir doações monetárias.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      maxWidth: '94vw',
      data: {
        title: 'Excluir Doação em Dinheiro',
        message: `Tem certeza que deseja excluir a doação #${doacao.id} de ${formatCurrencyBRL(doacao.valor)} de "${doacao.doador}" em ${doacao.data_doacao}?\n\nEsta operação é irreversível e permitida apenas para administradores.`,
        confirmText: 'Sim, Excluir',
        confirmColor: 'warn',
        icon: 'delete_forever',
        isDestructive: true,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.doacoesMonetariasService.deleteDoacaoMonetaria(doacao.id);
        this.onDataChanged();
      }
    });
  }

  confirmDeleteDirecionamento(
    direcionamento: DirecionamentoDoacao,
    unidadeMedida = '',
    event?: Event,
  ): void {
    if (event) {
      event.stopPropagation();
    }

    if (!this.isAdmin()) {
      this.toast.error(
        'Apenas administradores possuem permissão para excluir direcionamentos de doações.',
      );
      return;
    }

    const localNome = direcionamento.local?.local || 'Local';
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      maxWidth: '94vw',
      data: {
        title: 'Remover Direcionamento',
        message: `Deseja remover o direcionamento de ${direcionamento.volume} ${unidadeMedida} para "${localNome}"?\n\nO volume será estornado imediatamente para o saldo disponível da doação de origem.`,
        confirmText: 'Sim, Remover',
        confirmColor: 'warn',
        icon: 'remove_circle',
        isDestructive: true,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.doacoesService.deleteDirecionamento(direcionamento.id);
        this.onDataChanged();
      }
    });
  }
}
