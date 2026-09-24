import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  ConsultaExame,
  ConsultaExameCreateDto,
  ConsultaExameUpdateDto,
  TIPO_OPERACAO_OPTIONS,
} from '../../models/consulta-exame.model';
import {
  getSexoIcon,
  getStatusBadgeClass,
  getTipoBadgeClass,
  getTipoFaIcon,
  Pet,
} from '../../models/pet.model';
import { ConsultasExamesService } from '../../services/consultas-exames.service';
import { PetsService } from '../../services/pets.service';

@Component({
  selector: 'app-procedimento-form',
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
    FormErrorPipe,
    DateMaskDirective,
  ],
  templateUrl: './procedimento-form.html',
  styleUrls: ['./procedimento-form.scss'],
})
export default class ProcedimentoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavigationService);
  private petsService = inject(PetsService);
  private consultasExamesService = inject(ConsultasExamesService);
  private veterinariosService = inject(VeterinariosService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  public petId = signal<number | null>(null);
  public procedimentoId = signal<number | null>(null);
  public pet = signal<Pet | null>(null);
  public existingProcedimento = signal<ConsultaExame | null>(null);

  public isEditing = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public loadingVets = signal<boolean>(false);

  public veterinarios = signal<Veterinario[]>([]);
  public tipoOperacaoOptions = TIPO_OPERACAO_OPTIONS;

  public procedimentoForm = this.fb.group({
    tipo_operacao: ['', [Validators.required, Validators.maxLength(30)]],
    operacao_medicamento: ['', [Validators.required, Validators.maxLength(300)]],
    data_realizacao: [null as Date | null, [Validators.required]],
    custo: [null as number | null, [Validators.min(0)]],
    id_veterinario: [null as number | null],
  });

  readonly getTipoFaIcon = getTipoFaIcon;
  readonly getTipoBadgeClass = getTipoBadgeClass;
  readonly getSexoIcon = getSexoIcon;
  readonly getStatusBadgeClass = getStatusBadgeClass;

  async ngOnInit(): Promise<void> {
    const petIdParam = this.route.snapshot.paramMap.get('petId');
    const procIdParam = this.route.snapshot.paramMap.get('procedimentoId');

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

    // Carregar dados do pet e veterinários em paralelo
    await Promise.all([this.loadPetData(idPet), this.loadVeterinarios()]);

    // Se estiver em modo edição
    if (procIdParam) {
      const idProc = parseInt(procIdParam, 10);
      if (!isNaN(idProc)) {
        this.isEditing.set(true);
        this.procedimentoId.set(idProc);
        await this.loadProcedimentoData(idProc);
      }
    }
  }

  async loadPetData(id: number): Promise<void> {
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

  async loadProcedimentoData(id: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const proc = await this.consultasExamesService.getConsultaExameById(id);
      if (!proc) {
        this.toast.error('Registro clínico não encontrado.');
        this.goBack();
        return;
      }

      this.existingProcedimento.set(proc);
      this.procedimentoForm.patchValue({
        tipo_operacao: proc.tipo_operacao,
        operacao_medicamento: proc.operacao_medicamento,
        data_realizacao: parseIsoToDate(proc.data_realizacao),
        custo: proc.custo != null ? Number(proc.custo) : null,
        id_veterinario: proc.id_veterinario || null,
      });
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar dados do procedimento.');
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
        const currentList = this.veterinarios();
        this.veterinarios.set([newVet, ...currentList.filter((v) => v.id !== newVet.id)]);
        this.procedimentoForm.controls.id_veterinario.setValue(newVet.id);
        this.toast.info(`Veterinário(a) "${newVet.nome}" selecionado(a) automaticamente.`);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.procedimentoForm.invalid) {
      this.procedimentoForm.markAllAsTouched();
      this.toast.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const currentPetId = this.petId();
    if (!currentPetId) {
      this.toast.error('Identificador do pet ausente.');
      return;
    }

    const formValues = this.procedimentoForm.getRawValue();
    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.procedimentoId()) {
        const updateDto: ConsultaExameUpdateDto = {
          tipo_operacao: formValues.tipo_operacao || undefined,
          operacao_medicamento: sanitize(formValues.operacao_medicamento) || '',
          data_realizacao: dateToIsoString(formValues.data_realizacao) || undefined,
          custo: formValues.custo != null ? Number(formValues.custo) : null,
          id_veterinario: formValues.id_veterinario || null,
        };

        const updated = await this.consultasExamesService.updateConsultaExame(
          this.procedimentoId()!,
          updateDto
        );
        if (updated) {
          this.goBack();
        }
      } else {
        const createDto: ConsultaExameCreateDto = {
          id_pet: currentPetId,
          tipo_operacao: formValues.tipo_operacao || 'Outro',
          operacao_medicamento: sanitize(formValues.operacao_medicamento) || '',
          data_realizacao: dateToIsoString(formValues.data_realizacao) || '',
          custo: formValues.custo != null ? Number(formValues.custo) : null,
          id_veterinario: formValues.id_veterinario || null,
        };

        const created = await this.consultasExamesService.createConsultaExame(createDto);
        if (created) {
          this.goBack();
        }
      }
    } catch (err) {
      console.error('Erro ao salvar procedimento/consulta:', err);
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
