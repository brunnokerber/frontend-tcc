import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationService } from '@core/services/navigation.service';
import { ToastService } from '@core/services/toast.service';
import {
  ConsultaExame,
  getSexoIcon,
  getStatusBadgeClass,
  getTipoBadgeClass,
  getTipoFaIcon,
  Pet,
  PetLocal,
  SortOrderMode,
  Vacina,
} from '../../models/pet.model';
import { ConsultasExamesService } from '../../services/consultas-exames.service';
import { PetsLocaisService } from '../../services/pets-locais.service';
import { PetsService } from '../../services/pets.service';
import { VacinasService } from '../../services/vacinas.service';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatTabsModule,
  ],
  templateUrl: './pet-detail.html',
  styleUrls: ['./pet-detail.scss'],
})
export default class PetDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavigationService);
  public petsService = inject(PetsService);
  public vacinasService = inject(VacinasService);
  public consultasExamesService = inject(ConsultasExamesService);
  public petsLocaisService = inject(PetsLocaisService);
  private toast = inject(ToastService);

  public petId = signal<number | null>(null);
  public pet = this.petsService.cachedPet;
  public vacinas = this.vacinasService.vacinas;
  public consultasExames = this.consultasExamesService.consultas;
  public petsLocais = this.petsLocaisService.petsLocais;

  public loadingPet = this.petsService.loading;
  public loadingVacinas = this.vacinasService.loading;
  public loadingConsultas = this.consultasExamesService.loading;
  public loadingLocais = this.petsLocaisService.loading;

  // Modos de ordenação (Toggles)
  public vacinaSortMode = signal<SortOrderMode>('cronologico');
  public procedimentoSortMode = signal<SortOrderMode>('cronologico');

  // Computeds de ordenação
  public sortedVacinas = computed(() => {
    const list = [...this.vacinas()];
    const mode = this.vacinaSortMode();

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

  public sortedConsultas = computed(() => {
    const list = [...this.consultasExames()];
    const mode = this.procedimentoSortMode();

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

  public sortedLocais = computed(() => {
    const list = [...this.petsLocais()];
    return list.sort((a, b) => {
      const dateA = new Date(a.data_saida || a.data_reentrada || a.created_at || 0).getTime();
      const dateB = new Date(b.data_saida || b.data_reentrada || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  });

  // Métricas financeiras e de saúde
  public totalCustoVacinas = computed(() =>
    this.vacinas().reduce((acc, v) => acc + (Number(v.custo) || 0), 0)
  );

  public totalCustoConsultas = computed(() =>
    this.consultasExames().reduce((acc, c) => acc + (Number(c.custo) || 0), 0)
  );

  public totalCustoAuxilio = computed(() =>
    this.petsLocais().reduce((acc, l) => acc + (Number(l.valor_auxilio) || 0), 0)
  );

  public totalInvestidoGeral = computed(
    () => this.totalCustoVacinas() + this.totalCustoConsultas() + this.totalCustoAuxilio()
  );

  public diasNoAbrigo = computed(() => {
    const p = this.pet();
    const dataEntradaStr = p?.entradas?.[0]?.data_entrada;
    if (!dataEntradaStr) return null;

    const entrada = new Date(dataEntradaStr);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - entrada.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  });

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.toast.error('ID do pet não informado.');
      this.goBack();
      return;
    }

    const id = Number(idParam);
    if (isNaN(id)) {
      this.toast.error('ID inválido.');
      this.goBack();
      return;
    }

    this.petId.set(id);

    // Otimização: A responsabilidade de cache e estado é das services singleton.
    // Ao navegar de volta (seja por salvar, cancelar ou voltar), se os dados já existirem em memória para o id,
    // nenhuma chamada de rede é feita.
    this.loadPetAndSubCollections(id);
  }

  loadPetAndSubCollections(id: number, forceRefresh = false): void {
    this.petsService.getPetById(id, forceRefresh);
    this.vacinasService.getVacinasByPetId(id, forceRefresh);
    this.consultasExamesService.getConsultasExamesByPetId(id, forceRefresh);
    this.petsLocaisService.getPetsLocaisByPetId(id, forceRefresh);
  }

  setVacinaSort(mode: SortOrderMode) {
    this.vacinaSortMode.set(mode);
  }

  setProcedimentoSort(mode: SortOrderMode) {
    this.procedimentoSortMode.set(mode);
  }

  readonly getStatusBadgeClass = getStatusBadgeClass;
  readonly getTipoBadgeClass = getTipoBadgeClass;
  readonly getTipoFaIcon = getTipoFaIcon;
  readonly getSexoIcon = getSexoIcon;

  goBack() {
    this.nav.back('/pets');
  }

  goToEdit() {
    const p = this.pet();
    if (p) {
      this.router.navigate(['/pets', p.id, 'editar'], { state: { pet: p } });
    }
  }

  openAddVacina() {
    const p = this.pet();
    if (p) {
      this.router.navigate(['/pets', p.id, 'vacinas', 'nova'], { state: { pet: p } });
    }
  }

  openEditVacina(vacina: Vacina) {
    const p = this.pet();
    if (p && vacina.id) {
      this.router.navigate(['/pets', p.id, 'vacinas', vacina.id, 'editar'], {
        state: { pet: p, vacina },
      });
    }
  }

  openAddProcedimento() {
    const p = this.pet();
    if (p) {
      this.router.navigate(['/pets', p.id, 'procedimentos', 'novo'], { state: { pet: p } });
    }
  }

  openEditProcedimento(proc: ConsultaExame) {
    const p = this.pet();
    if (p && proc.id) {
      this.router.navigate(['/pets', p.id, 'procedimentos', proc.id, 'editar'], {
        state: { pet: p, procedimento: proc },
      });
    }
  }

  openAddLocal() {
    const p = this.pet();
    if (p) {
      this.router.navigate(['/pets', p.id, 'locais', 'novo'], { state: { pet: p } });
    }
  }

  openEditLocal(local: PetLocal) {
    const p = this.pet();
    if (p && local.id) {
      this.router.navigate(['/pets', p.id, 'locais', local.id, 'editar'], {
        state: { pet: p, petLocal: local },
      });
    }
  }
}
