import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { FilterPanelComponent } from '@shared/components/filter-panel/filter-panel';
import { StatCardComponent } from '@shared/components/stat-card/stat-card';
import { formatPhone, onlyDigits } from '@shared/utils/string-utils';
import {
  DirecionamentoDialogComponent,
  DirecionamentoDialogData,
} from '@features/doacoes/components/direcionamento-dialog/direcionamento-dialog';
import {
  DoacaoDialogComponent,
  DoacaoDialogData,
} from '@features/doacoes/components/doacao-dialog/doacao-dialog';
import {
  DirecionamentoDoacao,
  DOACAO_SEARCH_FIELDS,
  Doacao,
  DoacaoFilter,
  DoacaoStatus,
} from '@features/doacoes/models/doacao.model';
import { DoacoesService } from '@features/doacoes/services/doacoes.service';

@Component({
  selector: 'app-doacoes-insumos-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatCardComponent,
    FilterPanelComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './doacoes-insumos-tab.html',
  styleUrls: ['./doacoes-insumos-tab.scss'],
})
export class DoacoesInsumosTabComponent implements OnInit {
  public doacoesService = inject(DoacoesService);
  public authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public readonly dataChanged = output<void>();

  public isAdmin = this.authService.isAdmin;

  // Filtros de busca
  public searchField = signal<string>('doador');
  public searchValue = signal<string>('');
  public statusFilter = signal<'todos' | DoacaoStatus>('todos');
  public readonly searchFields = DOACAO_SEARCH_FIELDS;

  // Linhas expandidas na visualização master-detail
  public expandedRows = signal<Set<number>>(new Set());

  // Paginação
  public pageIndex = signal<number>(0);
  public pageSize = signal<number>(10);
  public readonly pageSizeOptions = [10, 25, 50, 100];

  // Totais e KPIs computados
  public totalDoacoes = computed(() => this.doacoesService.doacoes().length);
  public totalComSaldo = computed(
    () => this.doacoesService.doacoes().filter((d) => (d.volume_disponivel ?? 0) > 0).length,
  );
  public totalEsgotadas = computed(
    () => this.doacoesService.doacoes().filter((d) => (d.volume_disponivel ?? 0) <= 0).length,
  );
  public totalDirecionamentos = computed(() => this.doacoesService.direcionamentos().length);

  // Lista Paginada
  public pagedDoacoes = computed(() => {
    const list = this.doacoesService.doacoes();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  private lastAppliedFilterJson: string | null = null;

  async ngOnInit(): Promise<void> {
    const qp = this.route.snapshot.queryParams;
    if (qp['field']) {
      this.searchField.set(qp['field']);
    }
    if (qp['value']) {
      this.searchValue.set(qp['value']);
    }
    if (qp['status']) {
      this.statusFilter.set(qp['status'] as 'todos' | DoacaoStatus);
    }

    await this.applyFilters(true);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onSearchFieldChange(newField: string): void {
    this.searchField.set(newField);
    this.searchValue.set('');
  }

  getSearchPlaceholder(): string {
    const found = this.searchFields.find((f) => f.value === this.searchField());
    return found?.placeholder || 'Digite o termo de busca...';
  }

  applyFilters(force = false): void {
    if (this.doacoesService.loading()) {
      return;
    }

    const val = this.searchValue().trim();
    const field = this.searchField();
    const status = this.statusFilter();

    const filterParams: DoacaoFilter = {
      searchField: val ? field : undefined,
      searchValue: val || undefined,
      status: status !== 'todos' ? status : undefined,
    };

    const currentFilterJson = JSON.stringify(filterParams);
    if (!force && this.lastAppliedFilterJson === currentFilterJson) {
      return;
    }

    this.lastAppliedFilterJson = currentFilterJson;
    this.pageIndex.set(0);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        field: val ? field : undefined,
        value: val || undefined,
        status: status !== 'todos' ? status : undefined,
      },
      replaceUrl: true,
    });

    this.doacoesService.fetchDoacoes(filterParams);
  }

  clearFilters(): void {
    if (this.doacoesService.loading()) return;
    this.searchValue.set('');
    this.searchField.set('doador');
    this.statusFilter.set('todos');
    this.pageIndex.set(0);
    this.applyFilters(true);
  }

  toggleExpandRow(id: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
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
        this.applyFilters(true);
        this.dataChanged.emit();
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
        const current = new Set(this.expandedRows());
        current.add(doacao.id);
        this.expandedRows.set(current);
        this.applyFilters(true);
        this.doacoesService.fetchDirecionamentos();
        this.dataChanged.emit();
      }
    });
  }

  confirmDeleteDoacao(doacao: Doacao, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const totalDirec = doacao.direcionamentos?.length ?? 0;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      maxWidth: '94vw',
      data: {
        title: 'Excluir Doação',
        message: `Tem certeza que deseja excluir a doação #${doacao.id} de "${doacao.doador}" (${doacao.volume} ${doacao.unidade_medida})?${
          totalDirec > 0
            ? `\n\nATENÇÃO: Existem ${totalDirec} direcionamento(s) para locais que também serão excluídos automaticamente!`
            : ''
        }`,
        confirmText: 'Sim, Excluir',
        confirmColor: 'warn',
        icon: 'delete_forever',
        isDestructive: true,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.doacoesService.deleteDoacao(doacao.id);
        this.dataChanged.emit();
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
        this.dataChanged.emit();
      }
    });
  }

  formatPhone(phone?: string | null): string {
    return formatPhone(phone);
  }

  getWhatsAppLink(phone?: string | null): string {
    const digits = onlyDigits(phone);
    return `https://wa.me/55${digits}`;
  }

  async copyPhone(phone?: string | null, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    if (!phone) return;

    const formatted = formatPhone(phone);
    try {
      await navigator.clipboard.writeText(formatted);
      this.toast.info(`Telefone ${formatted} copiado!`);
    } catch {
      this.toast.error('Não foi possível copiar o telefone.');
    }
  }

  getProgressBarColor(percentual: number): 'primary' | 'accent' | 'warn' {
    if (percentual >= 100) return 'accent';
    if (percentual > 0) return 'primary';
    return 'warn';
  }
}
