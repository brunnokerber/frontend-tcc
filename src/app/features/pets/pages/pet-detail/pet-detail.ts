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
  getTipoFaIcon,
  getTipoIcon,
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
  public pet = signal<Pet | null>(null);
  public vacinas = signal<Vacina[]>([]);
  public consultasExames = signal<ConsultaExame[]>([]);
  public petsLocais = signal<PetLocal[]>([]);

  public loadingPet = signal<boolean>(true);
  public loadingDetails = signal<boolean>(true);

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

    // Otimização: Verificar se recebemos dados do pet via Router State da listagem
    const statePet = history.state?.pet as Pet | undefined;
    if (statePet && statePet.id === id) {
      this.pet.set(statePet);
      this.loadingPet.set(false);
      this.loadSubCollections(id);
    } else {
      // Carregamento completo do banco
      this.loadFullPet(id);
    }
  }

  async loadFullPet(id: number) {
    this.loadingPet.set(true);
    try {
      const petData = await this.petsService.getPetById(id);
      if (!petData) {
        this.toast.error('Pet não encontrado.');
        this.goBack();
        return;
      }
      this.pet.set(petData);
      await this.loadSubCollections(id);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar dados do pet.');
    } finally {
      this.loadingPet.set(false);
    }
  }

  async loadSubCollections(id: number) {
    this.loadingDetails.set(true);
    try {
      const [vacs, consultas, locais] = await Promise.all([
        this.vacinasService.getVacinasByPetId(id),
        this.consultasExamesService.getConsultasExamesByPetId(id),
        this.petsLocaisService.getPetsLocaisByPetId(id),
      ]);

      this.vacinas.set(vacs);
      this.consultasExames.set(consultas);
      this.petsLocais.set(locais);
    } catch (err) {
      console.error('Erro ao carregar registros clínicos e locais:', err);
    } finally {
      this.loadingDetails.set(false);
    }
  }

  setVacinaSort(mode: SortOrderMode) {
    this.vacinaSortMode.set(mode);
  }

  setProcedimentoSort(mode: SortOrderMode) {
    this.procedimentoSortMode.set(mode);
  }

  readonly getStatusBadgeClass = getStatusBadgeClass;
  readonly getTipoIcon = getTipoIcon;
  readonly getTipoFaIcon = getTipoFaIcon;
  readonly getSexoIcon = getSexoIcon;

  goBack() {
    this.nav.back('/pets');
  }

  goToEdit() {
    const p = this.pet();
    if (p) {
      this.router.navigate(['/pets', p.id, 'editar']);
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
      this.router.navigate(['/pets', p.id, 'vacinas', vacina.id, 'editar'], { state: { pet: p } });
    }
  }

  openAddProcedimento() {
    this.toast.info('O módulo de registro de consultas e exames será implementado na próxima etapa.');
  }

  openEditProcedimento(proc: ConsultaExame) {
    this.toast.info(`Edição de "${proc.operacao_medicamento}" será implementada na próxima etapa.`);
  }

  openAddLocal() {
    this.toast.info('O módulo de histórico de locais de passagem será implementado na próxima etapa.');
  }

  openEditLocal(local: PetLocal) {
    this.toast.info('A edição de locais de passagem será implementada na próxima etapa.');
  }
}
