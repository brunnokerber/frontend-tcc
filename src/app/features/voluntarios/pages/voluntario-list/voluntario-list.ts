import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { formatPhone, onlyDigits } from '@shared/utils/string-utils';
import { VoluntarioDialogComponent } from '../../components/voluntario-dialog/voluntario-dialog';
import {
  DIAS_SEMANA_OPTIONS,
  TURNOS_OPTIONS,
  Voluntario,
  VOLUNTARIO_SEARCH_FIELDS_OPTIONS,
  VoluntarioFilter,
} from '../../models/voluntario.model';
import { VoluntariosService } from '../../services/voluntarios.service';

@Component({
  selector: 'app-voluntario-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './voluntario-list.html',
  styleUrls: ['./voluntario-list.scss'],
})
export default class VoluntarioListComponent implements OnInit {
  public voluntariosService = inject(VoluntariosService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public isAdmin = this.authService.isAdmin;

  // Filtros
  public searchField = signal<'nome' | 'telefone' | 'email'>('nome');
  public searchValue = signal<string>('');
  public selectedDia = signal<string>('');
  public selectedTurno = signal<string>('');

  public searchFields = VOLUNTARIO_SEARCH_FIELDS_OPTIONS;
  public diasOptions = DIAS_SEMANA_OPTIONS;
  public turnosOptions = TURNOS_OPTIONS;

  // Paginação
  public pageIndex = signal<number>(0);
  public pageSize = signal<number>(10);
  public readonly pageSizeOptions = [10, 25, 50, 100];

  public totalVoluntarios = computed(() => this.voluntariosService.voluntarios().length);

  public totalFimDeSemana = computed(() =>
    this.voluntariosService
      .voluntarios()
      .filter((v) => v.dias_semana?.includes('Sábado') || v.dias_semana?.includes('Domingo'))
      .length
  );

  public totalManha = computed(() =>
    this.voluntariosService.voluntarios().filter((v) => v.turnos?.includes('Manhã')).length
  );

  public totalTardeNoite = computed(() =>
    this.voluntariosService
      .voluntarios()
      .filter((v) => v.turnos?.includes('Tarde') || v.turnos?.includes('Noite'))
      .length
  );

  public pagedVoluntarios = computed(() => {
    const list = this.voluntariosService.voluntarios();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  private lastAppliedFilterJson: string | null = null;

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['field']) {
      this.searchField.set(qp['field']);
    }
    if (qp['value']) {
      this.searchValue.set(qp['value']);
    }
    if (qp['dia']) {
      this.selectedDia.set(qp['dia']);
    }
    if (qp['turno']) {
      this.selectedTurno.set(qp['turno']);
    }
    this.applyFilters(true);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onSearchFieldChange(newField: 'nome' | 'telefone' | 'email'): void {
    this.searchField.set(newField);
    this.searchValue.set('');
  }

  getSearchPlaceholder(): string {
    const found = this.searchFields.find((f) => f.value === this.searchField());
    return found?.placeholder || 'Digite o termo de busca...';
  }

  applyFilters(force = false): void {
    if (this.voluntariosService.loading()) {
      return;
    }

    const val = this.searchValue().trim();
    const field = this.searchField();
    const dia = this.selectedDia().trim();
    const turno = this.selectedTurno().trim();

    const filterParams: VoluntarioFilter = {
      searchField: val ? field : undefined,
      searchValue: val || undefined,
      dia_semana: dia || undefined,
      turno: turno || undefined,
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
        dia: dia || undefined,
        turno: turno || undefined,
      },
      replaceUrl: true,
    });

    this.voluntariosService.fetchVoluntarios(filterParams);
  }

  clearFilters(): void {
    if (this.voluntariosService.loading()) return;
    this.searchValue.set('');
    this.searchField.set('nome');
    this.selectedDia.set('');
    this.selectedTurno.set('');
    this.pageIndex.set(0);
    this.applyFilters(true);
  }

  openVoluntarioDialog(voluntario?: Voluntario): void {
    const dialogRef = this.dialog.open(VoluntarioDialogComponent, {
      width: '600px',
      disableClose: true,
      autoFocus: false,
      data: {
        voluntario: voluntario || null,
      },
    });

    dialogRef.afterClosed().subscribe((result: Voluntario | null) => {
      if (result) {
        this.applyFilters(true);
      }
    });
  }

  confirmDelete(voluntario: Voluntario): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Excluir Voluntário',
        message: `Deseja realmente remover o(a) voluntário(a) "${voluntario.nome}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        color: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && voluntario.id) {
        const success = await this.voluntariosService.deleteVoluntario(voluntario.id);
        if (success) {
          this.applyFilters(true);
        }
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

  async copyEmail(email?: string | null, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      this.toast.info(`E-mail ${email} copiado!`);
    } catch {
      this.toast.error('Não foi possível copiar o e-mail.');
    }
  }
}
