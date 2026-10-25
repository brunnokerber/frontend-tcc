import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
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
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { AuditBadgeComponent } from '@shared/components/audit-badge/audit-badge';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { DialogLayoutComponent } from '@shared/components/dialog-layout/dialog-layout';
import { DateMaskDirective } from '@shared/directives/date-mask.directive';
import { PhoneMaskDirective } from '@shared/directives/phone-mask.directive';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { dateToIsoString, parseIsoToDate } from '@shared/utils/string-utils';
import { maxDateTodayValidator } from '@shared/validators/date.validators';
import { phoneValidator } from '@shared/validators/phone.validators';
import { PetsService } from '../../../pets/services/pets.service';
import { DESPESA_CATEGORIAS, Despesa } from '../../models/despesa.model';
import { DespesasService } from '../../services/despesas.service';

export interface DespesaDialogData {
  despesa?: Despesa;
  id_pet?: number | null;
}

@Component({
  selector: 'app-despesa-dialog',
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
    MatDatepickerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    FormErrorPipe,
    PhoneMaskDirective,
    DateMaskDirective,
    DialogLayoutComponent,
    AuditBadgeComponent,
  ],
  templateUrl: './despesa-dialog.html',
  styleUrls: ['./despesa-dialog.scss'],
})
export class DespesaDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DespesaDialogComponent>);
  public data = inject<DespesaDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  private despesasService = inject(DespesasService);
  private petsService = inject(PetsService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);

  public readonly categorias = DESPESA_CATEGORIAS;
  public readonly valoresSugeridos = [50, 100, 200, 500, 1000];
  public petsDisponiveis = signal<{ id: number; nome: string }[]>([]);

  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);
  public isAdmin = this.authService.isAdmin;

  public form = this.fb.nonNullable.group({
    descricao: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    categoria: ['', [Validators.required]],
    valor: [null as unknown as number, [Validators.required, Validators.min(0.01)]],
    data_despesa: [new Date(), [Validators.required, maxDateTodayValidator()]],
    favorecido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    telefone: ['', [phoneValidator()]],
    observacoes: ['', [Validators.maxLength(255)]],
    id_pet: [null as number | null],
  });

  async ngOnInit(): Promise<void> {
    // Carrega pets ativos para associação opcional
    try {
      const pets = await this.petsService.fetchPets();
      this.petsDisponiveis.set(pets.map((p) => ({ id: p.id, nome: p.nome })));
    } catch {
      // Ignora falha de pets, associação é opcional
    }

    if (this.data?.despesa) {
      this.isEditing.set(true);
      const d = this.data.despesa;
      this.form.patchValue({
        descricao: d.descricao,
        categoria: d.categoria,
        valor: d.valor,
        data_despesa: parseIsoToDate(d.data_despesa) || new Date(),
        favorecido: d.favorecido,
        telefone: d.telefone || '',
        observacoes: d.observacoes || '',
        id_pet: d.id_pet || null,
      });
    } else if (this.data?.id_pet) {
      this.form.patchValue({
        id_pet: this.data.id_pet,
      });
    }
  }

  aplicarValorSugerido(val: number): void {
    this.form.controls.valor.setValue(val);
    this.form.controls.valor.markAsDirty();
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    const dataIso = dateToIsoString(raw.data_despesa) || new Date().toISOString().slice(0, 10);

    try {
      if (this.isEditing() && this.data?.despesa?.id) {
        const result = await this.despesasService.updateDespesa(this.data.despesa.id, {
          descricao: raw.descricao,
          categoria: raw.categoria,
          valor: raw.valor,
          data_despesa: dataIso,
          favorecido: raw.favorecido,
          telefone: raw.telefone,
          observacoes: raw.observacoes,
          id_pet: raw.id_pet,
        });

        if (result) {
          this.dialogRef.close(true);
        }
      } else {
        const result = await this.despesasService.createDespesa({
          descricao: raw.descricao,
          categoria: raw.categoria,
          valor: raw.valor,
          data_despesa: dataIso,
          favorecido: raw.favorecido,
          telefone: raw.telefone,
          observacoes: raw.observacoes,
          id_pet: raw.id_pet,
        });

        if (result) {
          this.dialogRef.close(true);
        }
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmarExclusao(): void {
    const despesa = this.data?.despesa;
    if (!despesa?.id) return;

    if (!this.isAdmin()) {
      this.toast.error('Apenas administradores possuem permissão para excluir despesas.');
      return;
    }

    const dialogConfirm = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Excluir Despesa',
        message: `Tem certeza que deseja remover permanentemente o registro de despesa "${despesa.descricao}" no valor de R$ ${Number(despesa.valor).toFixed(2)}? Esta ação não pode ser desfeita.`,
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete_forever',
        isDestructive: true,
      },
      width: '450px',
    });

    dialogConfirm.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && despesa.id) {
        this.isDeleting.set(true);
        try {
          const success = await this.despesasService.deleteDespesa(despesa.id);
          if (success) {
            this.dialogRef.close(true);
          }
        } finally {
          this.isDeleting.set(false);
        }
      }
    });
  }
}
