import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationService } from '@core/services/navigation.service';
import { ToastService } from '@core/services/toast.service';
import { VeterinarioDialogComponent } from '@features/veterinarios/components/veterinario-dialog/veterinario-dialog';
import { Veterinario } from '@features/veterinarios/models/veterinario.model';
import { VeterinariosService } from '@features/veterinarios/services/veterinarios.service';
import { DateMaskDirective } from '@shared/directives/date-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { dateToIsoString, parseIsoToDate, sanitize } from '@shared/utils/string-utils';
import {
  getSexoIcon,
  getStatusBadgeClass,
  getTipoFaIcon,
  Pet,
} from '../../models/pet.model';
import {
  VACINAS_SUGESTOES,
  Vacina,
  VacinaCreateDto,
  VacinaUpdateDto,
} from '../../models/vacina.model';
import { PetsService } from '../../services/pets.service';
import { VacinasService } from '../../services/vacinas.service';

@Component({
  selector: 'app-vacina-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatDialogModule,
    FormErrorPipe,
    DateMaskDirective,
  ],
  templateUrl: './vacina-form.html',
  styleUrls: ['./vacina-form.scss'],
})
export default class VacinaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavigationService);
  private petsService = inject(PetsService);
  private vacinasService = inject(VacinasService);
  private veterinariosService = inject(VeterinariosService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public petId = signal<number | null>(null);
  public vacinaId = signal<number | null>(null);
  public pet = signal<Pet | null>(null);
  public existingVacina = signal<Vacina | null>(null);

  public isEditing = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public loadingVets = signal<boolean>(false);

  public veterinarios = signal<Veterinario[]>([]);
  public vacinasSugestoes = VACINAS_SUGESTOES;
  public vacinaSearchText = signal<string>('');

  // Filtro inteligente e insensível a maiúsculas/acentos
  public filteredVacinas = computed(() => {
    const query = (this.vacinaSearchText() || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (!query) {
      return this.vacinasSugestoes;
    }

    return this.vacinasSugestoes.filter((v) => {
      const normalized = v
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return normalized.includes(query);
    });
  });

  public vacinaForm = this.fb.group({
    nome_vacina: ['', [Validators.required, Validators.maxLength(30)]],
    data_prevista: [null as Date | null, [Validators.required]],
    data_aplicacao: [null as Date | null],
    custo: [null as number | null, [Validators.min(0)]],
    id_veterinario: [null as number | null],
  });

  readonly getTipoFaIcon = getTipoFaIcon;
  readonly getSexoIcon = getSexoIcon;
  readonly getStatusBadgeClass = getStatusBadgeClass;

  async ngOnInit(): Promise<void> {
    // Monitora a digitação no campo de vacina para filtrar o autocomplete em tempo real
    this.vacinaForm.controls.nome_vacina.valueChanges.subscribe((val) => {
      this.vacinaSearchText.set(val || '');
    });

    const petIdParam = this.route.snapshot.paramMap.get('petId');
    const vacinaIdParam = this.route.snapshot.paramMap.get('vacinaId');

    if (!petIdParam) {
      this.toast.error('Pet não identificado.');
      this.goBack();
      return;
    }

    const idPet = parseInt(petIdParam, 10);
    if (isNaN(idPet)) {
      this.toast.error('ID do pet inválido.');
      this.goBack();
      return;
    }

    this.petId.set(idPet);

    // Carregar veterinários e dados do pet em paralelo
    await Promise.all([this.loadPetData(idPet), this.loadVeterinarios()]);

    // Verificar se é modo de edição
    if (vacinaIdParam) {
      const idVac = parseInt(vacinaIdParam, 10);
      if (!isNaN(idVac)) {
        this.isEditing.set(true);
        this.vacinaId.set(idVac);
        await this.loadVacinaData(idVac);
      }
    }
  }

  async loadPetData(id: number): Promise<void> {
    // Tenta obter dados do pet via history state (otimização)
    const statePet = history.state?.pet as Pet | undefined;
    if (statePet && statePet.id === id) {
      this.pet.set(statePet);
      return;
    }

    const pet = await this.petsService.getPetById(id);
    if (!pet) {
      this.toast.error('Pet não encontrado.');
      this.goBack();
      return;
    }
    this.pet.set(pet);
  }

  async loadVeterinarios(): Promise<void> {
    this.loadingVets.set(true);
    try {
      const vets = await this.veterinariosService.fetchVeterinarios();
      this.veterinarios.set(vets);
    } catch (err) {
      console.error('Erro ao carregar veterinários:', err);
    } finally {
      this.loadingVets.set(false);
    }
  }

  async loadVacinaData(id: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const vacina = await this.vacinasService.getVacinaById(id);
      if (!vacina) {
        this.toast.error('Registro de vacina não encontrado.');
        this.goBack();
        return;
      }

      this.existingVacina.set(vacina);
      this.vacinaForm.patchValue({
        nome_vacina: vacina.nome_vacina,
        data_prevista: parseIsoToDate(vacina.data_prevista),
        data_aplicacao: parseIsoToDate(vacina.data_aplicacao),
        custo: vacina.custo != null ? Number(vacina.custo) : null,
        id_veterinario: vacina.id_veterinario || null,
      });
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar dados da vacina.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openNewVeterinarioDialog(): void {
    const dialogRef = this.dialog.open(VeterinarioDialogComponent, {
      width: '520px',
      disableClose: true,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((newVet: Veterinario | null) => {
      if (newVet) {
        // Atualiza a lista local e seleciona o veterinário criado
        const currentList = this.veterinarios();
        this.veterinarios.set([newVet, ...currentList.filter((v) => v.id !== newVet.id)]);
        this.vacinaForm.controls.id_veterinario.setValue(newVet.id);
        this.toast.info(`Veterinário(a) "${newVet.nome}" selecionado(a) automaticamente.`);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.vacinaForm.invalid) {
      this.vacinaForm.markAllAsTouched();
      this.toast.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const currentPetId = this.petId();
    if (!currentPetId) {
      this.toast.error('Identificador do pet ausente.');
      return;
    }

    const formValues = this.vacinaForm.getRawValue();
    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.vacinaId()) {
        const updateDto: VacinaUpdateDto = {
          nome_vacina: sanitize(formValues.nome_vacina) || '',
          data_prevista: dateToIsoString(formValues.data_prevista) || undefined,
          data_aplicacao: dateToIsoString(formValues.data_aplicacao),
          custo: formValues.custo != null ? Number(formValues.custo) : null,
          id_veterinario: formValues.id_veterinario || null,
        };

        const updated = await this.vacinasService.updateVacina(this.vacinaId()!, updateDto);
        if (updated) {
          this.goBack();
        }
      } else {
        const createDto: VacinaCreateDto = {
          id_pet: currentPetId,
          nome_vacina: sanitize(formValues.nome_vacina) || '',
          data_prevista: dateToIsoString(formValues.data_prevista) || '',
          data_aplicacao: dateToIsoString(formValues.data_aplicacao),
          custo: formValues.custo != null ? Number(formValues.custo) : null,
          id_veterinario: formValues.id_veterinario || null,
        };

        const created = await this.vacinasService.createVacina(createDto);
        if (created) {
          this.goBack();
        }
      }
    } catch (err) {
      console.error('Erro ao salvar vacina:', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    const id = this.petId();
    const fallback = id ? ['/pets', 'detalhes', id] : ['/pets'];
    this.nav.back(fallback);
  }
}
