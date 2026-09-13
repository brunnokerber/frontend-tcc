import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { formatPhone, onlyDigits } from '@shared/utils/string-utils';
import { VeterinariosService } from '../../services/veterinarios.service';

@Component({
  selector: 'app-veterinario-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './veterinario-list.html',
  styleUrls: ['./veterinario-list.scss'],
})
export default class VeterinarioListComponent implements OnInit {
  public veterinariosService = inject(VeterinariosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
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

  goToEdit(id: number): void {
    this.router.navigate(['/veterinarios', id, 'editar']);
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
