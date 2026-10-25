import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { VeterinarioDialogComponent } from '@features/veterinarios/components/veterinario-dialog/veterinario-dialog';
import { Veterinario } from '@features/veterinarios/models/veterinario.model';
import { VeterinariosService } from '@features/veterinarios/services/veterinarios.service';
import { AuditBadgeComponent } from '@shared/components/audit-badge/audit-badge';
import { DialogLayoutComponent } from '@shared/components/dialog-layout/dialog-layout';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '@shared/components/confirmation-dialog/confirmation-dialog';
import { DateMaskDirective } from '@shared/directives/date-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { dateToIsoString, parseIsoToDate } from '@shared/utils/string-utils';
import { maxDateTodayValidator } from '@shared/validators/date.validators';
import { getSexoIcon, getTipoBadgeClass, getTipoFaIcon, Pet } from '../../models/pet.model';
import {
  VACINAS_SUGESTOES,
  Vacina,
  VacinaCalendarioItem,
  VacinaCreateDto,
  VacinaPetInfo,
  VacinaUpdateDto,
} from '../../models/vacina.model';
import { PetsService } from '../../services/pets.service';
import { VacinasService } from '../../services/vacinas.service';

export interface VacinaDialogData {
  vacina?: VacinaCalendarioItem | Vacina | null;
  petId?: number;
  pet?: VacinaPetInfo | Pet | null;
  defaultDataPrevista?: string;
}

@Component({
  selector: 'app-vacina-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DialogLayoutComponent,
    DateMaskDirective,
    FormErrorPipe,
    AuditBadgeComponent,
  ],
  templateUrl: './vacina-dialog.html',
  styleUrls: ['./vacina-dialog.scss'],
})
export class VacinaDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<VacinaDialogComponent>);
  public data: VacinaDialogData = inject(MAT_DIALOG_DATA);
  private vacinasService = inject(VacinasService);
  private veterinariosService = inject(VeterinariosService);
  private petsService = inject(PetsService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  public isAdmin = this.authService.isAdmin;
  public isSaving = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);
  public loadingVets = signal<boolean>(false);
  public loadingPets = signal<boolean>(false);

  public veterinarios = signal<Veterinario[]>([]);
  public petsDisponiveis = signal<Pet[]>([]);
  public vacinasSugestoes = VACINAS_SUGESTOES;
  public today = new Date();

  public isEditing = computed(() => !!this.data?.vacina?.id);
  public pet = computed(() => {
    if (this.data?.pet) return this.data.pet;
    if (this.data?.vacina && 'pet' in this.data.vacina && this.data.vacina.pet) {
      return this.data.vacina.pet;
    }
    return null;
  });

  public vacinaForm = this.fb.group({
    id_pet: [
      this.data?.petId || this.data?.vacina?.id_pet || (null as number | null),
      [Validators.required],
    ],
    nome_vacina: ['', [Validators.required, Validators.maxLength(100)]],
    data_prevista: [null as Date | string | null, [Validators.required]],
    data_aplicacao: [null as Date | string | null, [maxDateTodayValidator()]],
    custo: [null as number | null, [Validators.min(0)]],
    id_veterinario: [null as number | null],
  });

  public filteredVacinas = computed(() => {
    const rawVal = this.vacinaForm.controls.nome_vacina.value || '';
    const query = rawVal
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (!query) {
      return this.vacinasSugestoes;
    }

    return this.vacinasSugestoes.filter((v) =>
      v
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes(query),
    );
  });

  async ngOnInit(): Promise<void> {
    await this.carregarVeterinarios();

    // Se não veio o pet e nem temos petId fixo, carrega pets para o seletor
    if (!this.pet() && !this.data?.petId) {
      await this.carregarPets();
    }

    if (this.data?.vacina) {
      const v = this.data.vacina;
      this.vacinaForm.patchValue({
        id_pet: v.id_pet,
        nome_vacina: v.nome_vacina,
        data_prevista: v.data_prevista ? parseIsoToDate(v.data_prevista) || v.data_prevista : '',
        data_aplicacao: v.data_aplicacao
          ? parseIsoToDate(v.data_aplicacao) || v.data_aplicacao
          : null,
        custo: v.custo != null ? Number(v.custo) : null,
        id_veterinario: v.id_veterinario || null,
      });
    } else if (this.data?.defaultDataPrevista) {
      this.vacinaForm.patchValue({
        data_prevista:
          parseIsoToDate(this.data.defaultDataPrevista) || this.data.defaultDataPrevista,
      });
    }
  }

  private async carregarVeterinarios(): Promise<void> {
    this.loadingVets.set(true);
    try {
      const vets = await this.veterinariosService.fetchVeterinarios();
      this.veterinarios.set(vets || []);
    } catch {
      this.veterinarios.set([]);
    } finally {
      this.loadingVets.set(false);
    }
  }

  private async carregarPets(): Promise<void> {
    this.loadingPets.set(true);
    try {
      const pets = await this.petsService.fetchPets();
      this.petsDisponiveis.set(pets || []);
    } catch {
      this.petsDisponiveis.set([]);
    } finally {
      this.loadingPets.set(false);
    }
  }

  public abrirNovoVetDialog(): void {
    const dialogRef = this.dialog.open(VeterinarioDialogComponent, {
      width: '500px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((newVet: Veterinario | undefined) => {
      if (newVet && newVet.id) {
        this.veterinarios.update((list) => [newVet, ...list]);
        this.vacinaForm.controls.id_veterinario.setValue(newVet.id);
      }
    });
  }

  public marcarComoAplicadaHoje(): void {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    this.vacinaForm.controls.data_aplicacao.setValue(hoje);
    this.vacinaForm.controls.data_aplicacao.markAsDirty();
    this.vacinaForm.controls.data_aplicacao.markAsTouched();
    this.vacinaForm.controls.data_aplicacao.updateValueAndValidity();
  }

  public limparAplicacao(): void {
    this.vacinaForm.controls.data_aplicacao.setValue(null);
    this.vacinaForm.controls.data_aplicacao.markAsDirty();
  }

  public async onSalvar(): Promise<void> {
    if (this.vacinaForm.invalid || this.isSaving()) {
      this.vacinaForm.markAllAsTouched();
      return;
    }

    const formValues = this.vacinaForm.getRawValue();
    const dataPrevistaIso = dateToIsoString(formValues.data_prevista);
    if (!dataPrevistaIso) {
      this.toast.error('Informe uma data prevista válida (DD/MM/AAAA).');
      return;
    }

    let dataAplicacaoIso: string | null = null;
    if (formValues.data_aplicacao) {
      dataAplicacaoIso = dateToIsoString(formValues.data_aplicacao);
    }

    this.isSaving.set(true);
    try {
      if (this.isEditing() && this.data.vacina?.id) {
        const updateDto: VacinaUpdateDto = {
          nome_vacina: formValues.nome_vacina?.trim(),
          data_prevista: dataPrevistaIso,
          data_aplicacao: dataAplicacaoIso,
          custo: formValues.custo != null ? Number(formValues.custo) : null,
          id_veterinario: formValues.id_veterinario || null,
        };

        const result = await this.vacinasService.updateVacina(this.data.vacina.id, updateDto);
        if (result) {
          this.dialogRef.close({ action: 'saved', vacina: result });
        }
      } else {
        const createDto: VacinaCreateDto = {
          id_pet: formValues.id_pet!,
          nome_vacina: formValues.nome_vacina!.trim(),
          data_prevista: dataPrevistaIso,
          data_aplicacao: dataAplicacaoIso,
          custo: formValues.custo != null ? Number(formValues.custo) : null,
          id_veterinario: formValues.id_veterinario || null,
        };

        const result = await this.vacinasService.createVacina(createDto);
        if (result) {
          this.dialogRef.close({ action: 'saved', vacina: result });
        }
      }
    } catch {
      // Toast já tratado no service
    } finally {
      this.isSaving.set(false);
    }
  }

  public async onExcluir(): Promise<void> {
    if (!this.data.vacina?.id || this.isDeleting()) return;

    if (!this.isAdmin()) {
      this.toast.error(
        'Apenas administradores possuem permissão para excluir registros de vacinas.',
      );
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Excluir Vacina',
        message: `Tem certeza que deseja remover o registro da vacina "${this.data.vacina.nome_vacina}"?`,
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete_forever',
        isDestructive: true,
      } as ConfirmationDialogData,
      width: '440px',
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && this.data.vacina?.id) {
        this.isDeleting.set(true);
        try {
          const ok = await this.vacinasService.deleteVacina(this.data.vacina.id);
          if (ok) {
            this.dialogRef.close({ action: 'deleted', vacinaId: this.data.vacina.id });
          }
        } finally {
          this.isDeleting.set(false);
        }
      }
    });
  }

  public onCancelar(): void {
    this.dialogRef.close();
  }

  public getTipoFaIcon(tipo: string | undefined): string {
    return getTipoFaIcon(tipo || '');
  }

  public getTipoBadgeClass(tipo: string | undefined): string {
    return getTipoBadgeClass(tipo || '');
  }

  public getSexoIcon(sexo: string | undefined): string {
    return getSexoIcon(sexo || '');
  }
}
