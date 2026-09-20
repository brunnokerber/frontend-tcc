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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { formatPhone, onlyDigits } from '@shared/utils/string-utils';
import { VeterinarioDialogComponent } from '../../components/veterinario-dialog/veterinario-dialog';
import { Veterinario } from '../../models/veterinario.model';
import { VeterinariosService } from '../../services/veterinarios.service';

@Component({
  selector: 'app-veterinario-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './veterinario-list.html',
  styleUrls: ['./veterinario-list.scss'],
})
export default class VeterinarioListComponent implements OnInit {
  public veterinariosService = inject(VeterinariosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public search = signal<string>('');
  public totalVeterinarios = computed(() => this.veterinariosService.veterinarios().length);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['search']) {
      this.search.set(qp['search']);
    }
    this.applyFilters();
  }

  applyFilters(): void {
    const filterParams = {
      search: this.search() || undefined,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filterParams,
      replaceUrl: true,
    });

    this.veterinariosService.fetchVeterinarios(filterParams);
  }

  clearFilters(): void {
    this.search.set('');
    this.applyFilters();
  }

  openVeterinarioDialog(vet?: Veterinario): void {
    const dialogRef = this.dialog.open(VeterinarioDialogComponent, {
      width: '520px',
      disableClose: true,
      autoFocus: false,
      data: {
        veterinario: vet || null,
      },
    });

    dialogRef.afterClosed().subscribe((result: Veterinario | null) => {
      if (result) {
        this.applyFilters();
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
      this.toast.info(`Telefone ${formatted} copiado para a área de transferência!`);
    } catch {
      this.toast.error('Não foi possível copiar o telefone.');
    }
  }
}
