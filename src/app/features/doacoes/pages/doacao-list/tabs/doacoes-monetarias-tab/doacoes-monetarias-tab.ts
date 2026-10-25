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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { FilterPanelComponent } from '@shared/components/filter-panel/filter-panel';
import { StatCardComponent } from '@shared/components/stat-card/stat-card';
import { formatPhone, onlyDigits } from '@shared/utils/string-utils';
import {
  DoacaoMonetariaDialogComponent,
  DoacaoMonetariaDialogData,
} from '@features/doacoes/components/doacao-monetaria-dialog/doacao-monetaria-dialog';
import {
  DOACAO_MONETARIA_SEARCH_FIELDS,
  DoacaoMonetaria,
  DoacaoMonetariaFilter,
  formatCurrencyBRL,
} from '@features/doacoes/models/doacao-monetaria.model';
import { DoacoesMonetariasService } from '@features/doacoes/services/doacoes-monetarias.service';

@Component({
  selector: 'app-doacoes-monetarias-tab',
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
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './doacoes-monetarias-tab.html',
  styleUrls: ['./doacoes-monetarias-tab.scss'],
})
export class DoacoesMonetariasTabComponent implements OnInit {
  public doacoesMonetariasService = inject(DoacoesMonetariasService);
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public readonly dataChanged = output<void>();

  public isAdmin = this.authService.isAdmin;

  // Filtros de busca
  public searchFieldMonetaria = signal<string>('doador');
  public searchValueMonetaria = signal<string>('');
  public dataInicioMonetaria = signal<string>('');
  public dataFimMonetaria = signal<string>('');
  public readonly searchFieldsMonetaria = DOACAO_MONETARIA_SEARCH_FIELDS;

  // Paginação
  public pageIndexMonetaria = signal<number>(0);
  public pageSizeMonetaria = signal<number>(10);
  public readonly pageSizeOptions = [10, 25, 50, 100];

  // Totais computados
  public totalDoacoesMonetarias = computed(
    () => this.doacoesMonetariasService.doacoesMonetarias().length,
  );

  // Lista Paginada
  public pagedDoacoesMonetarias = computed(() => {
    const list = this.doacoesMonetariasService.doacoesMonetarias();
    const start = this.pageIndexMonetaria() * this.pageSizeMonetaria();
    return list.slice(start, start + this.pageSizeMonetaria());
  });

  async ngOnInit(): Promise<void> {
    await this.applyFiltersMonetaria(true);
  }

  onPageChangeMonetaria(event: PageEvent): void {
    this.pageIndexMonetaria.set(event.pageIndex);
    this.pageSizeMonetaria.set(event.pageSize);
  }

  onSearchFieldMonetariaChange(newField: string): void {
    this.searchFieldMonetaria.set(newField);
    this.searchValueMonetaria.set('');
  }

  getSearchPlaceholderMonetaria(): string {
    const found = this.searchFieldsMonetaria.find((f) => f.value === this.searchFieldMonetaria());
    return found?.placeholder || 'Digite o termo de busca...';
  }

  applyFiltersMonetaria(force = false): void {
    if (!force && this.doacoesMonetariasService.loading()) {
      return;
    }

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
  }

  clearFiltersMonetaria(): void {
    if (this.doacoesMonetariasService.loading()) return;
    this.searchValueMonetaria.set('');
    this.searchFieldMonetaria.set('doador');
    this.dataInicioMonetaria.set('');
    this.dataFimMonetaria.set('');
    this.pageIndexMonetaria.set(0);
    this.applyFiltersMonetaria(true);
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
        this.applyFiltersMonetaria(true);
        this.dataChanged.emit();
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
        this.dataChanged.emit();
      }
    });
  }
}
