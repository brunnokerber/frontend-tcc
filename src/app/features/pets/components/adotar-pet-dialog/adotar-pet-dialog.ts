import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '@core/services/toast.service';
import { LocalDialogComponent } from '@features/locais/components/local-dialog/local-dialog';
import { Local } from '@features/locais/models/local.model';
import { LocaisService } from '@features/locais/services/locais.service';
import { DialogLayoutComponent } from '@shared/components/dialog-layout/dialog-layout';
import { DateMaskDirective } from '@shared/directives/date-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { dateToIsoString, sanitize } from '@shared/utils/string-utils';
import {
  dateNotBeforeDateValidator,
  maxDateTodayValidator,
} from '@shared/validators/date.validators';
import { getSexoIcon, getTipoBadgeClass, getTipoFaIcon, Pet } from '../../models/pet.model';
import { PetsService } from '../../services/pets.service';

export interface AdotarPetDialogData {
  pet: Pet;
}

@Component({
  selector: 'app-adotar-pet-dialog',
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
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DialogLayoutComponent,
    DateMaskDirective,
    FormErrorPipe,
  ],
  templateUrl: './adotar-pet-dialog.html',
  styleUrls: ['./adotar-pet-dialog.scss'],
})
export class AdotarPetDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<AdotarPetDialogComponent>);
  public data: AdotarPetDialogData = inject(MAT_DIALOG_DATA);
  private petsService = inject(PetsService);
  private locaisService = inject(LocaisService);
  private toast = inject(ToastService);

  public isSaving = signal<boolean>(false);
  public loadingLocais = signal<boolean>(false);
  public locais = signal<Local[]>([]);
  public errorMessage = signal<string | null>(null);

  public readonly pet = this.data.pet;
  public readonly getTipoBadgeClass = getTipoBadgeClass;
  public readonly getTipoFaIcon = getTipoFaIcon;
  public readonly getSexoIcon = getSexoIcon;

  public adocaoForm = this.fb.group({
    id_local: [null as number | null, [Validators.required]],
    data_saida: [
      new Date() as Date | null,
      [
        Validators.required,
        maxDateTodayValidator('A data da adoção não pode ser posterior a hoje'),
        dateNotBeforeDateValidator(
          () => this.pet?.data_nascimento,
          'dataAntesNascimento',
          'A data da adoção não pode ser anterior ao nascimento do animal',
        ),
      ],
    ],
    motivo_saida: ['Adoção Definitiva', [Validators.required, Validators.maxLength(100)]],
    valor_auxilio: [null as number | null, [Validators.min(0)]],
    obs: ['Termo de adoção responsável assinado pelo tutor.', [Validators.maxLength(200)]],
  });

  async ngOnInit(): Promise<void> {
    await this.carregarLocais();
  }

  async carregarLocais(): Promise<void> {
    this.loadingLocais.set(true);
    try {
      const list = await this.locaisService.fetchLocais();
      this.locais.set(list || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar lista de locais.';
      this.toast.error(msg);
    } finally {
      this.loadingLocais.set(false);
    }
  }

  /**
   * Abre o modal de cadastro de novo Local diretamente deste formulário,
   * permitindo cadastrar o novo tutor/adotante na hora.
   */
  abrirNovoLocalDialog(): void {
    const ref = this.dialog.open(LocalDialogComponent, {
      width: '880px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      disableClose: true,
      autoFocus: false,
    });

    ref.afterClosed().subscribe((newLocal: Local | null) => {
      if (newLocal && newLocal.id) {
        this.locais.update((list) => [newLocal, ...list.filter((l) => l.id !== newLocal.id)]);
        this.adocaoForm.controls.id_local.setValue(newLocal.id);
        this.toast.info(`Novo local "${newLocal.local}" selecionado para a adoção.`);
      }
    });
  }

  async onConfirmar(): Promise<void> {
    if (this.adocaoForm.invalid) {
      this.adocaoForm.markAllAsTouched();
      this.toast.warning('Preencha os campos obrigatórios para registrar a adoção.');
      return;
    }

    const values = this.adocaoForm.getRawValue();
    if (!values.id_local || !values.data_saida) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const success = await this.petsService.adotarPet(this.pet.id, {
        id_local: values.id_local,
        data_saida: dateToIsoString(values.data_saida)!,
        motivo_saida: sanitize(values.motivo_saida) || 'Adoção Definitiva',
        obs: sanitize(values.obs) || null,
        valor_auxilio: values.valor_auxilio != null ? Number(values.valor_auxilio) : null,
      });

      if (success) {
        this.dialogRef.close(true);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir a adoção. Verifique os dados e tente novamente.';
      this.errorMessage.set(msg);
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancelar(): void {
    this.dialogRef.close(false);
  }
}
