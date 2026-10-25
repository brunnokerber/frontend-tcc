import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConsultaExame, Pet, SortOrderMode } from '@features/pets/models/pet.model';

@Component({
  selector: 'app-pet-procedimentos-card',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './pet-procedimentos-card.html',
  styleUrls: ['./pet-procedimentos-card.scss'],
})
export class PetProcedimentosCardComponent {
  public pet = input.required<Pet>();
  public consultas = input.required<ConsultaExame[]>();
  public loading = input<boolean>(false);
  public isAdmin = input<boolean>(false);

  public addProcedimento = output<void>();
  public editProcedimento = output<ConsultaExame>();
  public deleteProcedimento = output<ConsultaExame>();

  public sortMode = signal<SortOrderMode>('cronologico');

  public sortedConsultas = computed(() => {
    const list = [...this.consultas()];
    const mode = this.sortMode();

    if (mode === 'valor') {
      return list.sort((a, b) => (Number(b.custo) || 0) - (Number(a.custo) || 0));
    }

    // Cronológico (mais recentes primeiro)
    return list.sort((a, b) => {
      const dateA = new Date(a.data_realizacao || a.created_at || 0).getTime();
      const dateB = new Date(b.data_realizacao || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  });

  setSortMode(mode: SortOrderMode): void {
    this.sortMode.set(mode);
  }

  onAdd(): void {
    this.addProcedimento.emit();
  }

  onEdit(proc: ConsultaExame): void {
    this.editProcedimento.emit(proc);
  }

  onDelete(proc: ConsultaExame, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.deleteProcedimento.emit(proc);
  }
}
