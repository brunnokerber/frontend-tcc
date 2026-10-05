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
import { LocalDialogComponent } from '@features/locais/components/local-dialog/local-dialog';
import { Local } from '@features/locais/models/local.model';
import { LocaisService } from '@features/locais/services/locais.service';
import { DateMaskDirective } from '@shared/directives/date-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import {
  dateNotBeforeDateValidator,
  dateSequenceValidator,
  maxDateTodayValidator,
} from '@shared/validators/date.validators';
import { dateToIsoString, parseIsoToDate, sanitize } from '@shared/utils/string-utils';
import {
  getSexoIcon,
  getStatusBadgeClass,
  getTipoBadgeClass,
  getTipoFaIcon,
  Pet,
} from '../../models/pet.model';
import {
  PetLocal,
  PetLocalCreateDto,
  PetLocalUpdateDto,
} from '../../models/pet-local.model';
import { PetsLocaisService } from '../../services/pets-locais.service';
import { PetsService } from '../../services/pets.service';

export const MOTIVOS_SAIDA_SUGESTOES = [
  'Lar Temporário',
  'Internação Clínica',
  'Hospedagem / Hotelzinho',
  'Adestramento / Reabilitação',
  'Exposição de Adoção',
] as const;

@Component({
  selector: 'app-pet-local-form',
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
    MatDialogModule,
    MatAutocompleteModule,
    FormErrorPipe,
    DateMaskDirective,
  ],
  templateUrl: './pet-local-form.html',
  styleUrls: ['./pet-local-form.scss'],
})
export default class PetLocalFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavigationService);
  private petsService = inject(PetsService);
  private petsLocaisService = inject(PetsLocaisService);
  private locaisService = inject(LocaisService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public today = new Date();
  public petId = signal<number | null>(null);
  public petLocalId = signal<number | null>(null);
  public pet = signal<Pet | null>(null);
  public existingPetLocal = signal<PetLocal | null>(null);

  public isEditing = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public loadingLocais = signal<boolean>(false);

  public locais = signal<Local[]>([]);
  public motivosSugestoes = MOTIVOS_SAIDA_SUGESTOES;
  public motivoSearchText = signal<string>('');

  // Filtro inteligente e insensível a maiúsculas/acentos
  public filteredMotivos = computed(() => {
    const query = (this.motivoSearchText() || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (!query) {
      return this.motivosSugestoes;
    }

    return this.motivosSugestoes.filter((m) => {
      const normalized = m
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return normalized.includes(query);
    });
  });

  public petLocalForm = this.fb.group(
    {
      id_local: [null as number | null, [Validators.required]],
      data_saida: [
        null as Date | null,
        [
          Validators.required,
          maxDateTodayValidator('A data de início/saída não pode ser posterior a hoje'),
          dateNotBeforeDateValidator(
            () => this.pet()?.data_nascimento,
            'dataAntesNascimento',
            'A data de início/saída não pode ser anterior ao nascimento do pet'
          ),
        ],
      ],
      data_reentrada: [
        null as Date | null,
        [
          maxDateTodayValidator('A data de término/reentrada não pode ser posterior a hoje'),
          dateNotBeforeDateValidator(
            () => this.pet()?.data_nascimento,
            'dataAntesNascimento',
            'A data de término/reentrada não pode ser anterior ao nascimento do pet'
          ),
        ],
      ],
      motivo_saida: ['', [Validators.maxLength(100)]],
      valor_auxilio: [null as number | null, [Validators.min(0)]],
      obs: ['', [Validators.maxLength(500)]],
    },
    {
      validators: [
        dateSequenceValidator(
          'data_saida',
          'data_reentrada',
          'dataReentradaAntesSaida',
          'A data de retorno não pode ser anterior à data de início'
        ),
      ],
    }
  );


  // Helpers de visualização do Pet
  public getTipoBadgeClass = getTipoBadgeClass;
  public getTipoFaIcon = getTipoFaIcon;
  public getStatusBadgeClass = getStatusBadgeClass;
  public getSexoIcon = getSexoIcon;

  async ngOnInit(): Promise<void> {
    const routePetId = this.route.snapshot.paramMap.get('petId');
    const routePetLocalId = this.route.snapshot.paramMap.get('petLocalId');

    if (routePetId) {
      this.petId.set(Number(routePetId));
    }

    if (routePetLocalId) {
      this.petLocalId.set(Number(routePetLocalId));
      this.isEditing.set(true);
    }

    // Monitora alterações de texto do motivo para filtrar as sugestões
    this.petLocalForm.controls.motivo_saida.valueChanges.subscribe((val) => {
      this.motivoSearchText.set(val || '');
    });

    // Revalidação dinâmica da data_reentrada ao alterar data_saida
    this.petLocalForm.controls.data_saida.valueChanges.subscribe(() => {
      this.petLocalForm.controls.data_reentrada.updateValueAndValidity({ emitEvent: false });
    });

    // Carrega dados do Pet do state da rota ou via API
    const statePet = history.state?.pet as Pet | undefined;
    if (statePet && statePet.id === this.petId()) {
      this.pet.set(statePet);
      this.petLocalForm.controls.data_saida.updateValueAndValidity({ emitEvent: false });
      this.petLocalForm.controls.data_reentrada.updateValueAndValidity({ emitEvent: false });
    } else if (this.petId()) {
      this.loadPet(this.petId()!);
    }

    // Carrega lista de locais disponíveis
    await this.loadLocais();

    // Se estiver editando, busca os dados da passagem
    if (this.isEditing() && this.petLocalId()) {
      await this.loadPetLocal(this.petLocalId()!);
    }
  }

  async loadPet(id: number): Promise<void> {
    try {
      const p = await this.petsService.getPetById(id);
      if (p) {
        this.pet.set(p);
        this.petLocalForm.controls.data_saida.updateValueAndValidity({ emitEvent: false });
        this.petLocalForm.controls.data_reentrada.updateValueAndValidity({ emitEvent: false });
      }
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar dados do pet.');
    }
  }

  async loadLocais(): Promise<void> {
    this.loadingLocais.set(true);
    try {
      const list = await this.locaisService.fetchLocais();
      this.locais.set(list || []);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar lista de locais parceiros.');
    } finally {
      this.loadingLocais.set(false);
    }
  }

  async loadPetLocal(id: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const petLocal = await this.petsLocaisService.getPetLocalById(id);
      if (!petLocal) {
        this.toast.error('Registro de local de passagem não encontrado.');
        this.goBack();
        return;
      }

      this.existingPetLocal.set(petLocal);
      this.petLocalForm.patchValue({
        id_local: petLocal.id_local || null,
        data_saida: parseIsoToDate(petLocal.data_saida),
        data_reentrada: parseIsoToDate(petLocal.data_reentrada),
        motivo_saida: petLocal.motivo_saida || '',
        valor_auxilio: petLocal.valor_auxilio != null ? Number(petLocal.valor_auxilio) : null,
        obs: petLocal.obs || petLocal.observacoes || '',
      });
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar dados da passagem.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Abre o modal de cadastro de novo Local diretamente a partir deste formulário.
   */
  openNewLocalDialog(): void {
    const dialogRef = this.dialog.open(LocalDialogComponent, {
      width: '880px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      disableClose: true,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((newLocal: Local | null) => {
      if (newLocal && newLocal.id) {
        // Atualiza a lista local e seleciona o local recém-criado
        const currentList = this.locais();
        this.locais.set([newLocal, ...currentList.filter((l) => l.id !== newLocal.id)]);
        this.petLocalForm.controls.id_local.setValue(newLocal.id);
        this.toast.info(`Local "${newLocal.local}" selecionado automaticamente.`);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.petLocalForm.invalid) {
      this.petLocalForm.markAllAsTouched();
      this.toast.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const currentPetId = this.petId();
    if (!currentPetId) {
      this.toast.error('Identificador do pet ausente.');
      return;
    }

    const formValues = this.petLocalForm.getRawValue();

    // Validação de coerência cronológica: data_reentrada >= data_saida
    if (formValues.data_saida && formValues.data_reentrada) {
      if (new Date(formValues.data_reentrada) < new Date(formValues.data_saida)) {
        this.toast.warning('A data de retorno/reentrada não pode ser anterior à data de saída.');
        return;
      }
    }

    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.petLocalId()) {
        const updateDto: PetLocalUpdateDto = {
          id_local: formValues.id_local!,
          data_saida: dateToIsoString(formValues.data_saida)!,
          data_reentrada: dateToIsoString(formValues.data_reentrada) || null,
          motivo_saida: sanitize(formValues.motivo_saida) || null,
          valor_auxilio: formValues.valor_auxilio != null ? Number(formValues.valor_auxilio) : null,
          obs: sanitize(formValues.obs) || null,
        };

        const updated = await this.petsLocaisService.updatePetLocal(
          this.petLocalId()!,
          updateDto
        );
        if (updated) {
          this.goBack();
        }
      } else {
        const createDto: PetLocalCreateDto = {
          id_pet: currentPetId,
          id_local: formValues.id_local!,
          data_saida: dateToIsoString(formValues.data_saida)!,
          data_reentrada: dateToIsoString(formValues.data_reentrada) || null,
          motivo_saida: sanitize(formValues.motivo_saida) || null,
          valor_auxilio: formValues.valor_auxilio != null ? Number(formValues.valor_auxilio) : null,
          obs: sanitize(formValues.obs) || null,
        };

        const created = await this.petsLocaisService.createPetLocal(createDto);
        if (created) {
          this.goBack();
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar registro de local de passagem:', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack(): void {
    const currentPetId = this.petId();
    if (currentPetId) {
      this.router.navigate(['/pets/detalhes', currentPetId]);
    } else {
      this.nav.back(['/pets']);
    }
  }
}
