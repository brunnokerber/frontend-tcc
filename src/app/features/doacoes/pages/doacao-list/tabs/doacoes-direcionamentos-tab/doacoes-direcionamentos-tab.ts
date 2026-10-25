import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { Local } from '@features/locais/models/local.model';
import { LocaisService } from '@features/locais/services/locais.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { DirecionamentoDoacao } from '@features/doacoes/models/doacao.model';
import { DoacoesService } from '@features/doacoes/services/doacoes.service';

@Component({
  selector: 'app-doacoes-direcionamentos-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './doacoes-direcionamentos-tab.html',
  styleUrls: ['./doacoes-direcionamentos-tab.scss'],
})
export class DoacoesDirecionamentosTabComponent implements OnInit {
  public doacoesService = inject(DoacoesService);
  public authService = inject(AuthService);
  private locaisService = inject(LocaisService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public readonly dataChanged = output<void>();

  public isAdmin = this.authService.isAdmin;

  // Filtro por local
  public localFilterConsolidado = signal<number | 'todos'>('todos');
  public locaisList = signal<Local[]>([]);

  // Paginação
  public pageIndexDirecionamentos = signal<number>(0);
  public pageSizeDirecionamentos = signal<number>(10);
  public readonly pageSizeOptions = [10, 25, 50, 100];

  // Totais computados
  public totalDirecionamentos = computed(() => this.doacoesService.direcionamentos().length);

  // Lista Filtrada e Paginada
  public filteredDirecionamentos = computed(() => {
    const all = this.doacoesService.direcionamentos();
    const filterLocal = this.localFilterConsolidado();
    if (filterLocal === 'todos') {
      return all;
    }
    return all.filter((d) => d.id_local === filterLocal);
  });

  public pagedDirecionamentos = computed(() => {
    const list = this.filteredDirecionamentos();
    const start = this.pageIndexDirecionamentos() * this.pageSizeDirecionamentos();
    return list.slice(start, start + this.pageSizeDirecionamentos());
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.doacoesService.fetchDirecionamentos(), this.carregarLocais()]);
  }

  public async carregarLocais(): Promise<void> {
    try {
      const list = await this.locaisService.fetchLocais();
      this.locaisList.set(list);
    } catch {
      // Ignora silenciosamente, locaisService já trata
    }
  }

  onPageChangeDirecionamentos(event: PageEvent): void {
    this.pageIndexDirecionamentos.set(event.pageIndex);
    this.pageSizeDirecionamentos.set(event.pageSize);
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
}
