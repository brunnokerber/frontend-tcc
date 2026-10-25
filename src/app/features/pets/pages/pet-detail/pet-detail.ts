import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { NavigationService } from '@core/services/navigation.service';
import { ToastService } from '@core/services/toast.service';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '@shared/components/confirmation-dialog/confirmation-dialog';
import { ImagePreviewDialogComponent } from '@shared/components/image-preview-dialog/image-preview-dialog';
import { AdotarPetDialogComponent } from '../../components/adotar-pet-dialog/adotar-pet-dialog';
import { VacinaDialogComponent } from '../../components/vacina-dialog/vacina-dialog';
import { ConsultaExame, PetLocal, Vacina } from '../../models/pet.model';
import { ConsultasExamesService } from '../../services/consultas-exames.service';
import { PetsLocaisService } from '../../services/pets-locais.service';
import { PetsService } from '../../services/pets.service';
import { VacinasService } from '../../services/vacinas.service';
import { PetDetailHeaderComponent } from './components/pet-detail-header/pet-detail-header';
import { PetInfoCardComponent } from './components/pet-info-card/pet-info-card';
import { PetLocaisCardComponent } from './components/pet-locais-card/pet-locais-card';
import { PetProcedimentosCardComponent } from './components/pet-procedimentos-card/pet-procedimentos-card';
import { PetVacinasCardComponent } from './components/pet-vacinas-card/pet-vacinas-card';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PetDetailHeaderComponent,
    PetInfoCardComponent,
    PetVacinasCardComponent,
    PetProcedimentosCardComponent,
    PetLocaisCardComponent,
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
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  public isAdmin = this.authService.isAdmin;

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

  constructor() {
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

  async carregarFotoPet(caminhoFoto: string | null | undefined): Promise<string | null> {
    return this.petsService.getSignedFotoUrl(caminhoFoto, 3600);
  }

  openPhotoPreview(event: { url: string; nome: string }): void {
    this.dialog.open(ImagePreviewDialogComponent, {
      data: {
        imageUrl: event.url,
        title: event.nome,
        subtitle: 'Foto cadastrada do pet',
      },
      maxWidth: '92vw',
      maxHeight: '92vh',
    });
  }

  // Métricas financeiras e de permanência
  public totalCustoVacinas = computed(() =>
    this.vacinas().reduce((acc, v) => acc + (Number(v.custo) || 0), 0),
  );

  public totalCustoConsultas = computed(() =>
    this.consultasExames().reduce((acc, c) => acc + (Number(c.custo) || 0), 0),
  );

  public totalCustoAuxilio = computed(() =>
    this.petsLocais().reduce((acc, l) => acc + (Number(l.valor_auxilio) || 0), 0),
  );

  public totalInvestidoGeral = computed(
    () => this.totalCustoVacinas() + this.totalCustoConsultas() + this.totalCustoAuxilio(),
  );

  public diasNoAbrigo = computed(() => {
    const p = this.pet();
    const dataEntradaStr = p?.entradas?.[0]?.data_entrada;
    if (!dataEntradaStr) return null;

    const entrada = new Date(dataEntradaStr);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - entrada.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    this.loadPetAndSubCollections(id);
  }

  loadPetAndSubCollections(id: number, forceRefresh = false): void {
    this.petsService.getPetById(id, forceRefresh);
    this.vacinasService.getVacinasByPetId(id, forceRefresh);
    this.consultasExamesService.getConsultasExamesByPetId(id, forceRefresh);
    this.petsLocaisService.getPetsLocaisByPetId(id, forceRefresh);
  }

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

  confirmDeleteVacina(vac: Vacina): void {
    if (!vac.id) return;

    if (!this.isAdmin()) {
      this.toast.error(
        'Apenas administradores possuem permissão para excluir registros de vacinas.',
      );
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Excluir Vacina',
        message: `Tem certeza que deseja remover o registro da vacina "${vac.nome_vacina}"? Esta ação é definitiva e removerá o lançamento do histórico do animal.`,
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete_forever',
        isDestructive: true,
      } as ConfirmationDialogData,
      width: '440px',
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && vac.id) {
        await this.vacinasService.deleteVacina(vac.id);
      }
    });
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

  confirmDeleteProcedimento(proc: ConsultaExame): void {
    if (!proc.id) return;

    if (!this.isAdmin()) {
      this.toast.error(
        'Apenas administradores possuem permissão para excluir procedimentos clínicos ou exames.',
      );
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Excluir Procedimento / Exame',
        message: `Tem certeza que deseja remover o registro de "${proc.operacao_medicamento}"? Esta ação é definitiva e removerá o lançamento do histórico médico do animal.`,
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete_forever',
        isDestructive: true,
      } as ConfirmationDialogData,
      width: '460px',
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && proc.id) {
        await this.consultasExamesService.deleteConsultaExame(proc.id);
      }
    });
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
        this.loadPetAndSubCollections(p.id, true);
      }
    });
  }
}
