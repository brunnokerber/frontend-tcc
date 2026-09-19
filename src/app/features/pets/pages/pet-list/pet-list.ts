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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  getSexoIcon,
  getStatusBadgeClass,
  getTipoFaIcon,
  getTipoIcon,
  Pet,
  PORTE_OPTIONS,
  SENIORIDADE_OPTIONS,
  SEXO_OPTIONS,
  STATUS_OPTIONS,
  TIPO_PET_OPTIONS,
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
    MatTooltipModule,
  ],
  templateUrl: './pet-list.html',
  styleUrls: ['./pet-list.scss'],
})
export default class PetListComponent implements OnInit {
  public petsService = inject(PetsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Filtros em Signals
  public search = signal<string>('');
  public tipoFilter = signal<string>('');
  public sexoFilter = signal<string>('');
  public statusFilter = signal<string>('');
  public porteFilter = signal<string>('');
  public senioridadeFilter = signal<string>('');

  // Opções para os selects
  public tipoOptions = TIPO_PET_OPTIONS;
  public sexoOptions = SEXO_OPTIONS;
  public statusOptions = STATUS_OPTIONS;
  public porteOptions = PORTE_OPTIONS;
  public senioridadeOptions = SENIORIDADE_OPTIONS;

  // Estatísticas computadas
  public totalPets = computed(() => this.petsService.pets().length);
  public totalDisponiveis = computed(
    () => this.petsService.pets().filter((p) => p.status === 'Disponível').length,
  );
  public totalTratamento = computed(
    () => this.petsService.pets().filter((p) => p.status === 'Em Tratamento').length,
  );
  public totalAdotados = computed(
    () => this.petsService.pets().filter((p) => p.status === 'Adotado').length,
  );
  public totalObitos = computed(
    () => this.petsService.pets().filter((p) => p.status === 'Óbito').length,
  );

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['search']) this.search.set(qp['search']);
    if (qp['tipo_pet']) this.tipoFilter.set(qp['tipo_pet']);
    if (qp['sexo']) this.sexoFilter.set(qp['sexo']);
    if (qp['status']) this.statusFilter.set(qp['status']);
    if (qp['senioridade']) this.senioridadeFilter.set(qp['senioridade']);
    if (qp['porte']) this.porteFilter.set(qp['porte']);

    this.applyFilters();
  }

  applyFilters() {
    const filterParams = {
      search: this.search() || undefined,
      tipo_pet: this.tipoFilter() || undefined,
      sexo: this.sexoFilter() || undefined,
      status: this.statusFilter() || undefined,
      senioridade: this.senioridadeFilter() || undefined,
      porte: this.porteFilter() || undefined,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filterParams,
      replaceUrl: true,
    });

    this.petsService.fetchPets(filterParams);
  }

  clearFilters() {
    this.search.set('');
    this.tipoFilter.set('');
    this.sexoFilter.set('');
    this.statusFilter.set('');
    this.porteFilter.set('');
    this.senioridadeFilter.set('');
    this.applyFilters();
  }

  readonly getStatusBadgeClass = getStatusBadgeClass;
  readonly getTipoIcon = getTipoIcon;
  readonly getTipoFaIcon = getTipoFaIcon;
  readonly getSexoIcon = getSexoIcon;

  goToDetails(pet: Pet) {
    this.router.navigate(['/pets/detalhes', pet.id], { state: { pet } });
  }

  goToEdit(id: number) {
    this.router.navigate(['/pets', id, 'editar']);
  }
}
