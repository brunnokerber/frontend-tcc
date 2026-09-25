import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ToastService } from '@core/services/toast.service';
import { CepMaskDirective } from '@shared/directives/cep-mask.directive';
import { PhoneMaskDirective } from '@shared/directives/phone-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { formatCep, formatPhone, onlyDigits, sanitize } from '@shared/utils/string-utils';
import {
  Local,
  LocalCreateDto,
  LocalUpdateDto,
  TIPO_LOCAL_OPTIONS,
} from '../../models/local.model';
import { LocaisService } from '../../services/locais.service';

export interface LocalDialogData {
  local?: Local | null;
}

export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

@Component({
  selector: 'app-local-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    FormErrorPipe,
    PhoneMaskDirective,
    CepMaskDirective,
  ],
  templateUrl: './local-dialog.html',
  styleUrls: ['./local-dialog.scss'],
})
export class LocalDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<LocalDialogComponent>);
  public data = inject<LocalDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  private locaisService = inject(LocaisService);
  private toast = inject(ToastService);

  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public loadingCep = signal<boolean>(false);

  public tipoLocalOptions = TIPO_LOCAL_OPTIONS;
  public estadosBrasil = ESTADOS_BRASIL;

  public localForm = this.fb.group({
    tipo_local: ['Lar Temporário', [Validators.required, Validators.maxLength(30)]],
    local: ['', [Validators.required, Validators.maxLength(50)]],
    contato: ['', [Validators.required, Validators.maxLength(50)]],
    telefone: ['', [Validators.required, Validators.minLength(10)]],
    cep: ['', [Validators.required, Validators.minLength(8)]],
    rua: ['', [Validators.required, Validators.maxLength(50)]],
    numero: [null as number | null, [Validators.required, Validators.min(0)]],
    complemento: ['', [Validators.maxLength(30)]],
    bairro: ['', [Validators.required, Validators.maxLength(50)]],
    cidade: ['', [Validators.required, Validators.maxLength(50)]],
    estado: ['RS', [Validators.required, Validators.maxLength(2)]],
  });

  ngOnInit(): void {
    if (this.data && this.data.local) {
      const loc = this.data.local;
      this.isEditing.set(true);
      this.localForm.patchValue({
        tipo_local: loc.tipo_local,
        local: loc.local,
        contato: loc.contato,
        telefone: formatPhone(loc.telefone),
        cep: formatCep(loc.cep),
        rua: loc.rua,
        numero: loc.numero,
        complemento: loc.complemento || '',
        bairro: loc.bairro,
        cidade: loc.cidade,
        estado: loc.estado,
      });
    }
  }

  async onSearchCep(): Promise<void> {
    const rawCep = onlyDigits(this.localForm.controls.cep.value);
    if (rawCep.length !== 8) {
      return;
    }

    this.loadingCep.set(true);
    try {
      const address = await this.locaisService.fetchAddressByCep(rawCep);
      if (address) {
        this.localForm.patchValue({
          rua: address.rua || this.localForm.controls.rua.value,
          bairro: address.bairro || this.localForm.controls.bairro.value,
          cidade: address.cidade || this.localForm.controls.cidade.value,
          estado: address.estado || this.localForm.controls.estado.value,
        });
        this.toast.info('Endereço autopreenchido a partir do CEP.');
      }
    } catch {
      // Ignora falha silenciosamente
    } finally {
      this.loadingCep.set(false);
    }
  }

  async onSave(): Promise<void> {
    if (this.localForm.invalid) {
      this.localForm.markAllAsTouched();
      this.toast.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const formValues = this.localForm.getRawValue();
    const rawPhone = onlyDigits(formValues.telefone);
    const rawCep = onlyDigits(formValues.cep);

    if (rawPhone.length < 10 || rawPhone.length > 11) {
      this.toast.warning('Telefone inválido (insira DDD + 8 ou 9 dígitos).');
      return;
    }

    if (rawCep.length !== 8) {
      this.toast.warning('CEP inválido (o CEP deve conter 8 dígitos).');
      return;
    }

    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.data?.local?.id) {
        const updateDto: LocalUpdateDto = {
          tipo_local: formValues.tipo_local || 'Lar Temporário',
          local: sanitize(formValues.local) || '',
          contato: sanitize(formValues.contato) || '',
          telefone: rawPhone,
          cep: rawCep,
          rua: sanitize(formValues.rua) || '',
          numero: Number(formValues.numero) || 0,
          complemento: sanitize(formValues.complemento),
          bairro: sanitize(formValues.bairro) || '',
          cidade: sanitize(formValues.cidade) || '',
          estado: (sanitize(formValues.estado) || 'RS').toUpperCase(),
        };

        const updated = await this.locaisService.updateLocal(this.data.local.id, updateDto);
        if (updated) {
          this.dialogRef.close(updated);
        }
      } else {
        const createDto: LocalCreateDto = {
          tipo_local: formValues.tipo_local || 'Lar Temporário',
          local: sanitize(formValues.local) || '',
          contato: sanitize(formValues.contato) || '',
          telefone: rawPhone,
          cep: rawCep,
          rua: sanitize(formValues.rua) || '',
          numero: Number(formValues.numero) || 0,
          complemento: sanitize(formValues.complemento),
          bairro: sanitize(formValues.bairro) || '',
          cidade: sanitize(formValues.cidade) || '',
          estado: (sanitize(formValues.estado) || 'RS').toUpperCase(),
        };

        const created = await this.locaisService.createLocal(createDto);
        if (created) {
          this.dialogRef.close(created);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar local:', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
