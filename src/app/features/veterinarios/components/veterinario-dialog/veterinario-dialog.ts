import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '@core/services/toast.service';
import { PhoneMaskDirective } from '@shared/directives/phone-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { formatPhone, onlyDigits, sanitize } from '@shared/utils/string-utils';
import {
  Veterinario,
  VeterinarioCreateDto,
  VeterinarioUpdateDto,
} from '../../models/veterinario.model';
import { VeterinariosService } from '../../services/veterinarios.service';

export interface VeterinarioDialogData {
  veterinario?: Veterinario | null;
}

@Component({
  selector: 'app-veterinario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormErrorPipe,
    PhoneMaskDirective,
  ],
  templateUrl: './veterinario-dialog.html',
  styleUrls: ['./veterinario-dialog.scss'],
})
export class VeterinarioDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<VeterinarioDialogComponent>);
  public data = inject<VeterinarioDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  private veterinariosService = inject(VeterinariosService);
  private toast = inject(ToastService);

  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);

  public vetForm = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(30)]],
    crvet: ['', [Validators.required, Validators.maxLength(30)]],
    telefone: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit(): void {
    if (this.data && this.data.veterinario) {
      const vet = this.data.veterinario;
      this.isEditing.set(true);
      this.vetForm.patchValue({
        nome: vet.nome,
        crvet: vet.crvet,
        telefone: formatPhone(vet.telefone),
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.vetForm.invalid) {
      this.vetForm.markAllAsTouched();
      this.toast.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const formValues = this.vetForm.getRawValue();
    const rawDigitsPhone = onlyDigits(formValues.telefone);

    if (rawDigitsPhone.length < 10 || rawDigitsPhone.length > 11) {
      this.toast.warning('Por favor, insira um telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }

    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.data?.veterinario?.id) {
        const updateDto: VeterinarioUpdateDto = {
          nome: sanitize(formValues.nome) || '',
          crvet: sanitize(formValues.crvet) || '',
          telefone: rawDigitsPhone,
        };

        const updated = await this.veterinariosService.updateVeterinario(
          this.data.veterinario.id,
          updateDto
        );
        if (updated) {
          this.dialogRef.close(updated);
        }
      } else {
        const createDto: VeterinarioCreateDto = {
          nome: sanitize(formValues.nome) || '',
          crvet: sanitize(formValues.crvet) || '',
          telefone: rawDigitsPhone,
        };

        const created = await this.veterinariosService.createVeterinario(createDto);
        if (created) {
          this.dialogRef.close(created);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar veterinário na modal:', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
