import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
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
  Doacao,
  DoacaoCreateDto,
  DoacaoUpdateDto,
  TIPOS_DOACAO_SUGESTOES,
  UNIDADES_MEDIDA_SUGESTOES,
} from '../../models/doacao.model';
import { DoacoesService } from '../../services/doacoes.service';

export interface DoacaoDialogData {
  doacao?: Doacao | null;
}

@Component({
  selector: 'app-doacao-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    FormErrorPipe,
    PhoneMaskDirective,
    DialogLayoutComponent,
    AuditBadgeComponent,
  ],
  templateUrl: './doacao-dialog.html',
  styleUrls: ['./doacao-dialog.scss'],
})
export class DoacaoDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DoacaoDialogComponent>);
  public data = inject<DoacaoDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  private doacoesService = inject(DoacoesService);
  private toast = inject(ToastService);

  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public sugestoesTipoDoacao = TIPOS_DOACAO_SUGESTOES;
  public sugestoesUnidade = UNIDADES_MEDIDA_SUGESTOES;

  public tipoDoacaoQuery = signal<string>('');
  public filteredTiposDoacao = computed(() => {
    const q = this.tipoDoacaoQuery().toLowerCase().trim();
    if (!q) {
      return this.sugestoesTipoDoacao;
    }
    return this.sugestoesTipoDoacao.filter((tipo) => tipo.toLowerCase().includes(q));
  });

  public doacaoForm = this.fb.nonNullable.group({
    tipo_doacao: ['', [Validators.required, Validators.maxLength(50)]],
    doador: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    telefone: ['', [phoneValidator()]],
    volume: [null as unknown as number, [Validators.required, Validators.min(0.01)]],
    unidade_medida: ['kg', [Validators.required, Validators.maxLength(10)]],
  });

  ngOnInit(): void {
    const doacao = this.data?.doacao;
    if (doacao && doacao.id) {
      this.isEditing.set(true);
      this.doacaoForm.patchValue({
        tipo_doacao: doacao.tipo_doacao || '',
        doador: doacao.doador,
        telefone: doacao.telefone ? formatPhone(doacao.telefone) : '',
        volume: Number(doacao.volume),
        unidade_medida: doacao.unidade_medida,
      });
      this.tipoDoacaoQuery.set(doacao.tipo_doacao || '');
    }
  }

  onTipoDoacaoInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value || '';
    this.tipoDoacaoQuery.set(value);
  }

  setTipoDoacao(tipo: string): void {
    this.doacaoForm.controls.tipo_doacao.setValue(tipo);
    this.doacaoForm.controls.tipo_doacao.markAsDirty();
    this.tipoDoacaoQuery.set(tipo);
  }

  setUnidade(unidade: string): void {
    this.doacaoForm.controls.unidade_medida.setValue(unidade);
    this.doacaoForm.controls.unidade_medida.markAsDirty();
  }

  async onSave(): Promise<void> {
    if (this.doacaoForm.invalid) {
      this.doacaoForm.markAllAsTouched();
      this.toast.error('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const val = this.doacaoForm.getRawValue();
    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.data?.doacao?.id) {
        const updateDto: DoacaoUpdateDto = {
          tipo_doacao: sanitize(val.tipo_doacao) || '',
          doador: sanitize(val.doador) || '',
          telefone: val.telefone ? onlyDigits(val.telefone) || null : null,
          volume: Number(val.volume),
          unidade_medida: sanitize(val.unidade_medida) || 'kg',
        };
        const updated = await this.doacoesService.updateDoacao(this.data.doacao.id, updateDto);
        this.dialogRef.close(updated);
      } else {
        const createDto: DoacaoCreateDto = {
          tipo_doacao: sanitize(val.tipo_doacao) || '',
          doador: sanitize(val.doador) || '',
          telefone: val.telefone ? onlyDigits(val.telefone) || null : null,
          volume: Number(val.volume),
          unidade_medida: sanitize(val.unidade_medida) || 'kg',
        };
        const created = await this.doacoesService.createDoacao(createDto);
        this.dialogRef.close(created);
      }
    } catch {
      // Erros já tratados com toast no DoacoesService
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
