import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  getSexoIcon,
  getStatusBadgeClass,
  getTipoBadgeClass,
  getTipoFaIcon,
  Pet,
  PET_SEARCH_FIELDS_OPTIONS,
  PetSearchField,
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
    MatPaginatorModule,
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

  // Busca Dinâmica por Campo de Identificação / Registro
  public searchField = signal<PetSearchField>('nome');
  public searchValue = signal<string>('');
  public searchFields = PET_SEARCH_FIELDS_OPTIONS;

  // Filtros Categóricos em Signals
  public tipoFilter = signal<string>('');
  public sexoFilter = signal<string>('');
  public statusFilter = signal<string>('');
  public porteFilter = signal<string>('');
  public senioridadeFilter = signal<string>('');

  // Paginação
  public pageIndex = signal<number>(0);
  public pageSize = signal<number>(12);
  public readonly pageSizeOptions = [12, 24, 48, 96];

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

  // Lista Paginada
  public pagedPets = computed(() => {
    const list = this.petsService.pets();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  private lastAppliedFilterJson: string | null = null;

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['field']) {
      this.searchField.set(qp['field']);
    }
    if (qp['value']) {
      this.searchValue.set(qp['value']);
    } else if (qp['search']) {
      this.searchValue.set(qp['search']);
      this.searchField.set('nome');
    }

    if (qp['tipo_pet']) this.tipoFilter.set(qp['tipo_pet']);
    if (qp['sexo']) this.sexoFilter.set(qp['sexo']);
    if (qp['status']) this.statusFilter.set(qp['status']);
    if (qp['senioridade']) this.senioridadeFilter.set(qp['senioridade']);
    if (qp['porte']) this.porteFilter.set(qp['porte']);

    this.applyFilters(true);
  }

  onSearchFieldChange(newField: PetSearchField): void {
    this.searchField.set(newField);
    this.searchValue.set('');
  }

  getSearchPlaceholder(): string {
    const found = this.searchFields.find((f) => f.value === this.searchField());
    return found?.placeholder || 'Digite o termo de busca...';
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  applyFilters(force = false) {
    // Evita flood se uma requisição já estiver em andamento
    if (this.petsService.loading()) {
      return;
    }

    const val = this.searchValue().trim();
    const field = this.searchField();

    const filterParams = {
      searchField: val ? field : undefined,
      searchValue: val || undefined,
      tipo_pet: this.tipoFilter() || undefined,
      sexo: this.sexoFilter() || undefined,
      status: this.statusFilter() || undefined,
      senioridade: this.senioridadeFilter() || undefined,
      porte: this.porteFilter() || undefined,
    };

    const currentFilterJson = JSON.stringify(filterParams);

    // Economia de cotas: Não refaz a consulta se os filtros forem idênticos ao já carregado
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
        tipo_pet: filterParams.tipo_pet,
        sexo: filterParams.sexo,
        status: filterParams.status,
        senioridade: filterParams.senioridade,
        porte: filterParams.porte,
      },
      replaceUrl: true,
    });

    this.petsService.fetchPets(filterParams);
  }

  clearFilters() {
    if (this.petsService.loading()) return;

    this.searchValue.set('');
    this.searchField.set('nome');
    this.tipoFilter.set('');
    this.sexoFilter.set('');
    this.statusFilter.set('');
    this.porteFilter.set('');
    this.senioridadeFilter.set('');
    this.pageIndex.set(0);
    this.applyFilters(true);
  }


  readonly getStatusBadgeClass = getStatusBadgeClass;
  readonly getTipoBadgeClass = getTipoBadgeClass;
  readonly getTipoFaIcon = getTipoFaIcon;
  readonly getSexoIcon = getSexoIcon;

  goToDetails(pet: Pet) {
    this.petsService.setCachedPet(pet);
    this.router.navigate(['/pets/detalhes', pet.id]);
  }

  goToEdit(pet: Pet) {
    this.petsService.setCachedPet(pet);
    this.router.navigate(['/pets', pet.id, 'editar']);
  }
}
