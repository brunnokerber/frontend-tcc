import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
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
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { DespesaDialogComponent } from '@features/financeiro/components/despesa-dialog/despesa-dialog';
import { DESPESA_CATEGORIAS, Despesa } from '@features/financeiro/models/despesa.model';
import { DespesasService } from '@features/financeiro/services/despesas.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { FilterPanelComponent } from '@shared/components/filter-panel/filter-panel';

@Component({
  selector: 'app-financeiro-despesas-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FilterPanelComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './financeiro-despesas-tab.html',
  styleUrls: ['./financeiro-despesas-tab.scss'],
})
export class FinanceiroDespesasTabComponent {
  public despesasService = inject(DespesasService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public readonly dataChanged = output<void>();

  public isAdmin = this.authService.isAdmin;
  public readonly categoriasDespesas = DESPESA_CATEGORIAS;

  public despesas = this.despesasService.despesas;
  public loadingDespesas = this.despesasService.loading;

  public searchTermDespesas = signal<string>('');
  public selectedCategoriaDespesas = signal<string>('');
  public pageIndexDesp = signal<number>(0);
  public pageSizeDesp = signal<number>(10);
  public readonly pageSizeOptions = [10, 25, 50];

  public filteredDespesas = computed<Despesa[]>(() => {
    const list = this.despesas();
    const term = this.searchTermDespesas().toLowerCase().trim();
    const cat = this.selectedCategoriaDespesas();

    return list.filter((d) => {
      const matchTerm =
        !term ||
        d.descricao.toLowerCase().includes(term) ||
        d.favorecido.toLowerCase().includes(term);
      const matchCat = !cat || d.categoria === cat;
      return matchTerm && matchCat;
    });
  });

  public pagedDespesas = computed<Despesa[]>(() => {
    const all = this.filteredDespesas();
    const start = this.pageIndexDesp() * this.pageSizeDesp();
    return all.slice(start, start + this.pageSizeDesp());
  });

  onPageChangeDesp(event: PageEvent): void {
    this.pageIndexDesp.set(event.pageIndex);
    this.pageSizeDesp.set(event.pageSize);
  }

  limparFiltroDespesas(): void {
    this.searchTermDespesas.set('');
    this.selectedCategoriaDespesas.set('');
    this.pageIndexDesp.set(0);
  }

  openEditarDespesa(despesa: Despesa): void {
    const ref = this.dialog.open(DespesaDialogComponent, {
      data: { despesa },
      width: '760px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
    });

    ref.afterClosed().subscribe(async (salvou: boolean) => {
      if (salvou) {
        await this.despesasService.fetchDespesas();
        this.dataChanged.emit();
      }
    });
  }

  confirmDeleteDespesa(despesa: Despesa, event?: Event): void {
    if (event) event.stopPropagation();

    if (!this.isAdmin()) {
      this.toast.error('Apenas administradores possuem permissão para excluir despesas.');
      return;
    }

    const ref = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Excluir Despesa',
        message: `Deseja realmente remover o lançamento de "${despesa.descricao}" no valor de R$ ${Number(despesa.valor).toFixed(2)}?`,
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete_forever',
        isDestructive: true,
      },
      width: '450px',
    });

    ref.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        const success = await this.despesasService.deleteDespesa(despesa.id);
        if (success) {
          this.dataChanged.emit();
        }
      }
    });
  }
}
