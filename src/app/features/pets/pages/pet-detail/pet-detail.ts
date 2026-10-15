import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavigationService } from '@core/services/navigation.service';
import { ToastService } from '@core/services/toast.service';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog';
import { AdotarPetDialogComponent } from '../../components/adotar-pet-dialog/adotar-pet-dialog';
import { VacinaDialogComponent } from '../../components/vacina-dialog/vacina-dialog';
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
    RouterModule,
    DatePipe,
    CurrencyPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './pet-detail.html',
  styleUrls: ['./pet-detail.scss'],
})

export default class PetDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavigationService);
  private dialog = inject(MatDialog);
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

  // Foto assinada do pet (Supabase Storage)
  public fotoUrl = signal<string | null>(null);

  public loadingPet = this.petsService.loading;
  public loadingVacinas = this.vacinasService.loading;
  public loadingConsultas = this.consultasExamesService.loading;
  public loadingLocais = this.petsLocaisService.loading;

  // Modos de ordenação (Toggles)
  public vacinaSortMode = signal<SortOrderMode>('cronologico');
  public procedimentoSortMode = signal<SortOrderMode>('cronologico');

  constructor() {
    // Reage dinamicamente às mudanças do pet em memória para buscar a URL assinada da foto
    effect(() => {
      const p = this.pet();
      const fotoPath = p?.foto_url;
      if (!fotoPath) {
        this.fotoUrl.set(null);
        return;
      }

      this.carregarFotoPet(fotoPath).then((url) => {
        this.fotoUrl.set(url);
      });
    });
  }

  /**
   * Obtém uma URL assinada temporária (1 hora) para o bucket privado 'pets' do Supabase Storage.
   */
  async carregarFotoPet(caminhoFoto: string | null | undefined): Promise<string | null> {
    return this.petsService.getSignedFotoUrl(caminhoFoto, 3600);
  }

  /**
   * Abre o modal de visualização ampliada (lightbox) com a foto do pet.
   */
  openPhotoPreview(url: string, nome: string): void {
    this.dialog.open(ImagePreviewDialogComponent, {
      data: {
        imageUrl: url,
        title: nome,
        subtitle: 'Foto cadastrada do pet',
      },
      maxWidth: '92vw',
      maxHeight: '92vh',
    });
  }

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
      const dialogRef = this.dialog.open(VacinaDialogComponent, {
        width: '640px',
        maxWidth: '95vw',
        disableClose: true,
        data: {
          petId: p.id,
          pet: p,
        },
      });

      dialogRef.afterClosed().subscribe((res) => {
        if (res && (res.action === 'saved' || res.action === 'deleted')) {
          this.vacinasService.getVacinasByPetId(p.id, true);
        }
      });
    }
  }

  openEditVacina(vacina: Vacina) {
    const p = this.pet();
    if (p && vacina.id) {
      const dialogRef = this.dialog.open(VacinaDialogComponent, {
        width: '640px',
        maxWidth: '95vw',
        disableClose: true,
        data: {
          petId: p.id,
          pet: p,
          vacina,
        },
      });

      dialogRef.afterClosed().subscribe((res) => {
        if (res && (res.action === 'saved' || res.action === 'deleted')) {
          this.vacinasService.getVacinasByPetId(p.id, true);
        }
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

  /**
   * Abre o modal padronizado de registro de adoção definitiva para o pet atual.
   */
  openAdotarModal(): void {
    const p = this.pet();
    if (!p) return;

    const dialogRef = this.dialog.open(AdotarPetDialogComponent, {
      data: { pet: p },
      width: '640px',
      maxWidth: '96vw',
      disableClose: true,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((adotadoComSucesso: boolean) => {
      if (adotadoComSucesso && p.id) {
        // Atualiza os dados do pet (agora 'Adotado') e recarrega os locais de passagem
        this.loadPetAndSubCollections(p.id, true);
      }
    });
  }
}
