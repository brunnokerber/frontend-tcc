import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { formatCep, formatPhone, onlyDigits } from '@shared/utils/string-utils';
import { LocalDialogComponent } from '../../components/local-dialog/local-dialog';
import { Local, SEARCH_FIELDS_OPTIONS, TIPO_LOCAL_OPTIONS } from '../../models/local.model';
import { LocaisService } from '../../services/locais.service';

@Component({
  selector: 'app-local-list',
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
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './local-list.html',
  styleUrls: ['./local-list.scss'],
})
export default class LocalListComponent implements OnInit {
  public locaisService = inject(LocaisService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public searchField = signal<string>('local');
  public searchValue = signal<string>('');
  public searchFields = SEARCH_FIELDS_OPTIONS;
  public tipoLocalOptions = TIPO_LOCAL_OPTIONS;

  public totalLocais = computed(() => this.locaisService.locais().length);
  public totalLares = computed(
    () => this.locaisService.locais().filter((l) => l.tipo_local === 'Lar Temporário').length
  );
  public totalClinicas = computed(
    () => this.locaisService.locais().filter((l) => l.tipo_local === 'Clínica Veterinária').length
  );
  public totalExposicoes = computed(
    () => this.locaisService.locais().filter((l) => l.tipo_local === 'Exposição').length
  );

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['field']) {
      this.searchField.set(qp['field']);
    }
    if (qp['value']) {
      this.searchValue.set(qp['value']);
    }
    this.applyFilters();
  }

  onSearchFieldChange(newField: string): void {
    this.searchField.set(newField);
    this.searchValue.set('');
  }

  getSearchPlaceholder(): string {
    const found = this.searchFields.find((f) => f.value === this.searchField());
    return found?.placeholder || 'Digite o termo de busca...';
  }

  applyFilters(): void {
    const val = this.searchValue().trim();
    const field = this.searchField();

    const filterParams = {
      searchField: val ? field : undefined,
      searchValue: val || undefined,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        field: val ? field : undefined,
        value: val || undefined,
      },
      replaceUrl: true,
    });

    this.locaisService.fetchLocais(filterParams);
  }

  clearFilters(): void {
    this.searchValue.set('');
    this.searchField.set('local');
    this.applyFilters();
  }

  openLocalDialog(local?: Local): void {
    const dialogRef = this.dialog.open(LocalDialogComponent, {
      width: '880px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      disableClose: true,
      autoFocus: false,
      data: {
        local: local || null,
      },
    });

    dialogRef.afterClosed().subscribe((result: Local | null) => {
      if (result) {
        this.applyFilters();
      }
    });
  }

  formatPhone(phone?: string | null): string {
    return formatPhone(phone);
  }

  formatCep(cep?: string | null): string {
    return formatCep(cep);
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
      this.toast.info(`Telefone ${formatted} copiado para a área de transferência!`);
    } catch {
      this.toast.error('Não foi possível copiar o telefone.');
    }
  }

  async copyAddress(loc: Local, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    const fullAddress = `${loc.rua}, ${loc.numero}${loc.complemento ? ' - ' + loc.complemento : ''}, ${loc.bairro}, ${loc.cidade} - ${loc.estado}, CEP: ${formatCep(loc.cep)}`;
    try {
      await navigator.clipboard.writeText(fullAddress);
      this.toast.info('Endereço completo copiado!');
    } catch {
      this.toast.error('Não foi possível copiar o endereço.');
    }
  }

  getTipoIcon(tipo: string): string {
    const found = this.tipoLocalOptions.find((t) => t.value === tipo);
    return found?.icon || 'location_on';
  }
}
