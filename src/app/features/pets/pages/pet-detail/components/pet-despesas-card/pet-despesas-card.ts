import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Pet, SortOrderMode } from '@features/pets/models/pet.model';
import { Despesa } from '@features/financeiro/models/despesa.model';

@Component({
  selector: 'app-pet-despesas-card',
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
  templateUrl: './pet-despesas-card.html',
  styleUrls: ['./pet-despesas-card.scss'],
})
export class PetDespesasCardComponent {
  public pet = input.required<Pet>();
  public despesas = input.required<Despesa[]>();
  public loading = input<boolean>(false);
  public isAdmin = input<boolean>(false);

  public addDespesa = output<void>();
  public editDespesa = output<Despesa>();
  public deleteDespesa = output<Despesa>();
  public viewDespesa = output<Despesa>();

  public sortMode = signal<SortOrderMode>('cronologico');

  public totalDespesas = computed(() =>
    this.despesas().reduce((acc, d) => acc + (Number(d.valor) || 0), 0),
  );

  public sortedDespesas = computed(() => {
    const list = [...this.despesas()];
    const mode = this.sortMode();

    if (mode === 'valor') {
      return list.sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
    }

    // Cronológico (mais recentes primeiro)
    return list.sort((a, b) => {
      const dateA = new Date(a.data_despesa || a.created_at || 0).getTime();
      const dateB = new Date(b.data_despesa || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  });

  setSortMode(mode: SortOrderMode): void {
    this.sortMode.set(mode);
  }

  onAdd(): void {
    this.addDespesa.emit();
  }

  onEdit(despesa: Despesa): void {
    this.editDespesa.emit(despesa);
  }

  onView(despesa: Despesa, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.viewDespesa.emit(despesa);
  }

  onDelete(despesa: Despesa, event: MouseEvent): void {
    event.stopPropagation();
    this.deleteDespesa.emit(despesa);
  }
}
