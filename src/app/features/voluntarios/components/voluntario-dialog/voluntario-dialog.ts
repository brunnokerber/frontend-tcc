import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '@core/services/toast.service';
import { PhoneMaskDirective } from '@shared/directives/phone-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { formatPhone, onlyDigits, sanitize } from '@shared/utils/string-utils';
import { emailValidator } from '@shared/validators/email.validators';
import { phoneValidator } from '@shared/validators/phone.validators';
import {
  DIAS_SEMANA_OPTIONS,
  DiaSemana,
  TURNOS_OPTIONS,
  Turno,
  Voluntario,
  VoluntarioCreateDto,
  VoluntarioUpdateDto,
} from '../../models/voluntario.model';
import { VoluntariosService } from '../../services/voluntarios.service';

export interface VoluntarioDialogData {
  voluntario?: Voluntario;
}

@Component({
  selector: 'app-voluntario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    PhoneMaskDirective,
    FormErrorPipe,
  ],
  templateUrl: './voluntario-dialog.html',
  styleUrls: ['./voluntario-dialog.scss'],
})
export class VoluntarioDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<VoluntarioDialogComponent>);
  public data = inject<VoluntarioDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  private voluntariosService = inject(VoluntariosService);
  private toast = inject(ToastService);

  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);

  public readonly diasOptions = DIAS_SEMANA_OPTIONS;
  public readonly turnosOptions = TURNOS_OPTIONS;

  public selectedDias = signal<string[]>([]);
  public selectedTurnos = signal<string[]>([]);

  public voluntarioForm = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [emailValidator(), Validators.maxLength(300)]],
    telefone: ['', [Validators.required, phoneValidator()]],
    observacoes: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    if (this.data && this.data.voluntario) {
      const v = this.data.voluntario;
      this.isEditing.set(true);
      this.selectedDias.set(v.dias_semana || []);
      this.selectedTurnos.set(v.turnos || []);
      this.voluntarioForm.patchValue({
        nome: v.nome,
        email: v.email || '',
        telefone: formatPhone(v.telefone),
        observacoes: v.observacoes || '',
      });
    }
  }

  toggleDia(dia: DiaSemana): void {
    const current = this.selectedDias();
    if (current.includes(dia)) {
      this.selectedDias.set(current.filter((d) => d !== dia));
    } else {
      this.selectedDias.set([...current, dia]);
    }
  }

  isDiaSelected(dia: DiaSemana): boolean {
    return this.selectedDias().includes(dia);
  }

  toggleTurno(turno: Turno): void {
    const current = this.selectedTurnos();
    if (current.includes(turno)) {
      this.selectedTurnos.set(current.filter((t) => t !== turno));
    } else {
      this.selectedTurnos.set([...current, turno]);
    }
  }

  isTurnoSelected(turno: Turno): boolean {
    return this.selectedTurnos().includes(turno);
  }

  async onSave(): Promise<void> {
    if (this.voluntarioForm.invalid) {
      this.voluntarioForm.markAllAsTouched();
      this.toast.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const formValues = this.voluntarioForm.getRawValue();
    const rawDigitsPhone = onlyDigits(formValues.telefone);

    this.isSaving.set(true);

    try {
      const payload: VoluntarioCreateDto = {
        nome: sanitize(formValues.nome) || '',
        email: sanitize(formValues.email),
        telefone: rawDigitsPhone,
        dias_semana: this.selectedDias(),
        turnos: this.selectedTurnos(),
        observacoes: sanitize(formValues.observacoes),
      };

      if (this.isEditing() && this.data?.voluntario?.id) {
        const updateDto: VoluntarioUpdateDto = payload;
        const updated = await this.voluntariosService.updateVoluntario(
          this.data.voluntario.id,
          updateDto
        );
        if (updated) {
          this.dialogRef.close(updated);
        }
      } else {
        const created = await this.voluntariosService.createVoluntario(payload);
        if (created) {
          this.dialogRef.close(created);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar voluntário na modal:', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
