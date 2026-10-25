import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Pet, PetLocal } from '@features/pets/models/pet.model';

@Component({
  selector: 'app-pet-locais-card',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './pet-locais-card.html',
  styleUrls: ['./pet-locais-card.scss'],
})
export class PetLocaisCardComponent {
  public pet = input.required<Pet>();
  public locais = input.required<PetLocal[]>();
  public loading = input<boolean>(false);

  public addLocal = output<void>();
  public editLocal = output<PetLocal>();

  public sortedLocais = computed(() => {
    const list = [...this.locais()];
    return list.sort((a, b) => {
      const dateA = new Date(a.data_saida || a.data_reentrada || a.created_at || 0).getTime();
      const dateB = new Date(b.data_saida || b.data_reentrada || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  });

  onAdd(): void {
    this.addLocal.emit();
  }

  onEdit(loc: PetLocal): void {
    this.editLocal.emit(loc);
  }
}
