import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Pet, SortOrderMode, Vacina } from '@features/pets/models/pet.model';

@Component({
  selector: 'app-pet-vacinas-card',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './pet-vacinas-card.html',
  styleUrls: ['./pet-vacinas-card.scss'],
})
export class PetVacinasCardComponent {
  public pet = input.required<Pet>();
  public vacinas = input.required<Vacina[]>();
  public loading = input<boolean>(false);
  public isAdmin = input<boolean>(false);

  public addVacina = output<void>();
  public editVacina = output<Vacina>();
  public deleteVacina = output<Vacina>();

  public sortMode = signal<SortOrderMode>('cronologico');

  public sortedVacinas = computed(() => {
    const list = [...this.vacinas()];
    const mode = this.sortMode();

    if (mode === 'valor') {
      return list.sort((a, b) => (Number(b.custo) || 0) - (Number(a.custo) || 0));
    }

    // Cronológico (mais recentes primeiro)
    return list.sort((a, b) => {
      const dateA = new Date(a.data_aplicacao || a.data_prevista || a.created_at || 0).getTime();
      const dateB = new Date(b.data_aplicacao || b.data_prevista || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  });

  setSortMode(mode: SortOrderMode): void {
    this.sortMode.set(mode);
  }

  onAdd(): void {
    this.addVacina.emit();
  }

  onEdit(vac: Vacina): void {
    this.editVacina.emit(vac);
  }

  onDelete(vac: Vacina, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.deleteVacina.emit(vac);
  }
}
