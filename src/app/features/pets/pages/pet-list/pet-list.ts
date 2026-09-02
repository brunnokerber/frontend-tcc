import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import {
  PORTE_OPTIONS,
  Pet,
  SEXO_OPTIONS,
  STATUS_OPTIONS,
  TIPO_PET_OPTIONS
} from '../../models/pet.model';
import { PetsService } from '../../services/pets.service';

@Component({
  selector: 'app-pet-list',
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
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './pet-list.html',
  styleUrls: ['./pet-list.scss']
})
export default class PetListComponent implements OnInit {
  public petsService = inject(PetsService);
  private router = inject(Router);

  // Filtros em Signals
  public search = signal<string>('');
  public tipoFilter = signal<string>('');
  public sexoFilter = signal<string>('');
  public statusFilter = signal<string>('');
  public porteFilter = signal<string>('');

  // Opções para os selects
  public tipoOptions = TIPO_PET_OPTIONS;
  public sexoOptions = SEXO_OPTIONS;
  public statusOptions = STATUS_OPTIONS;
  public porteOptions = PORTE_OPTIONS;

  // Estatísticas computadas
  public totalPets = computed(() => this.petsService.pets().length);
  public totalDisponiveis = computed(() =>
    this.petsService.pets().filter(p => p.status === 'Disponível').length
  );
  public totalTratamento = computed(() =>
    this.petsService.pets().filter(p => p.status === 'Em Tratamento').length
  );
  public totalAdotados = computed(() =>
    this.petsService.pets().filter(p => p.status === 'Adotado').length
  );

  ngOnInit() {
    this.applyFilters();
  }

  applyFilters() {
    this.petsService.fetchPets({
      search: this.search(),
      tipo_pet: this.tipoFilter() || undefined,
      sexo: this.sexoFilter() || undefined,
      status: this.statusFilter() || undefined,
      porte: this.porteFilter() || undefined
    });
  }

  clearFilters() {
    this.search.set('');
    this.tipoFilter.set('');
    this.sexoFilter.set('');
    this.statusFilter.set('');
    this.porteFilter.set('');
    this.applyFilters();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Disponível':
        return 'badge-status-disponivel';
      case 'Em Tratamento':
        return 'badge-status-tratamento';
      case 'Lar Temporário':
        return 'badge-status-lar';
      case 'Quarentena':
        return 'badge-status-quarentena';
      case 'Adotado':
        return 'badge-status-adotado';
      case 'Óbito':
        return 'badge-status-obito';
      default:
        return 'badge-status-disponivel';
    }
  }

  getTipoIcon(tipo: string): string {
    switch (tipo?.toLowerCase()) {
      case 'cachorro':
        return 'pets';
      case 'gato':
        return 'cruelty_free';
      default:
        return 'pest_control_rodent';
    }
  }

  getSexoIcon(sexo: string): string {
    return sexo === 'Fêmea' ? 'female' : 'male';
  }

  goToEdit(id: number) {
    this.router.navigate(['/pets', id, 'editar']);
  }
}
