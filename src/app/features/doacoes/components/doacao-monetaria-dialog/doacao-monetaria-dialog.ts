import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '@core/services/toast.service';
import { AuditBadgeComponent } from '@shared/components/audit-badge/audit-badge';
import { DialogLayoutComponent } from '@shared/components/dialog-layout/dialog-layout';
import { PhoneMaskDirective } from '@shared/directives/phone-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { formatPhone, onlyDigits, sanitize } from '@shared/utils/string-utils';
import { phoneValidator } from '@shared/validators/phone.validators';
import {
  DoacaoMonetaria,
  DoacaoMonetariaCreateDto,
  DoacaoMonetariaUpdateDto,
} from '../../models/doacao-monetaria.model';
import { DoacoesMonetariasService } from '../../services/doacoes-monetarias.service';

export interface DoacaoMonetariaDialogData {
  doacao?: DoacaoMonetaria | null;
}

@Component({
  selector: 'app-doacao-monetaria-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    FormErrorPipe,
    PhoneMaskDirective,
    DialogLayoutComponent,
    AuditBadgeComponent,
  ],
  templateUrl: './doacao-monetaria-dialog.html',
  styleUrls: ['./doacao-monetaria-dialog.scss'],
})
export class DoacaoMonetariaDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DoacaoMonetariaDialogComponent>);
  public data = inject<DoacaoMonetariaDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  private doacoesMonetariasService = inject(DoacoesMonetariasService);
  private toast = inject(ToastService);

  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);

  public readonly valoresSugeridos = [20, 50, 100, 200, 500];

  public form = this.fb.nonNullable.group({
    doador: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    telefone: ['', [phoneValidator()]],
    valor: [null as unknown as number, [Validators.required, Validators.min(0.01)]],
    data_doacao: [new Date().toISOString().substring(0, 10), [Validators.required]],
    observacoes: ['', [Validators.maxLength(255)]],
  });

  setValor(valor: number): void {
    this.form.patchValue({ valor });
    this.form.controls.valor.markAsDirty();
  }

  ngOnInit(): void {
    const doacao = this.data?.doacao;
    if (doacao && doacao.id) {
      this.isEditing.set(true);
      this.form.patchValue({
        doador: doacao.doador,
        telefone: doacao.telefone ? formatPhone(doacao.telefone) : '',
        valor: Number(doacao.valor),
        data_doacao: doacao.data_doacao,
        observacoes: doacao.observacoes || '',
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const val = this.form.getRawValue();
    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.data?.doacao?.id) {
        const updateDto: DoacaoMonetariaUpdateDto = {
          doador: sanitize(val.doador) || '',
          telefone: val.telefone ? onlyDigits(val.telefone) || null : null,
          valor: Number(val.valor),
          data_doacao: val.data_doacao,
          observacoes: sanitize(val.observacoes) || null,
        };
        const updated = await this.doacoesMonetariasService.updateDoacaoMonetaria(
          this.data.doacao.id,
          updateDto,
        );
        this.dialogRef.close(updated);
      } else {
        const createDto: DoacaoMonetariaCreateDto = {
          doador: sanitize(val.doador) || '',
          telefone: val.telefone ? onlyDigits(val.telefone) || null : null,
          valor: Number(val.valor),
          data_doacao: val.data_doacao,
          observacoes: sanitize(val.observacoes) || null,
        };
        const created = await this.doacoesMonetariasService.createDoacaoMonetaria(createDto);
        this.dialogRef.close(created);
      }
    } catch {
      // Erro já tratado com toast no serviço
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
