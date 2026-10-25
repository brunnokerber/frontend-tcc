import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ToastService } from '@core/services/toast.service';
import { Local } from '@features/locais/models/local.model';
import { LocaisService } from '@features/locais/services/locais.service';
import { DialogLayoutComponent } from '@shared/components/dialog-layout/dialog-layout';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import {
  DirecionamentoCreateDto,
  DirecionamentoDoacao,
  DirecionamentoUpdateDto,
  Doacao,
} from '../../models/doacao.model';
import { DoacoesService } from '../../services/doacoes.service';

export interface DirecionamentoDialogData {
  doacao: Doacao;
  direcionamento?: DirecionamentoDoacao | null;
}

@Component({
  selector: 'app-direcionamento-dialog',
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
    DialogLayoutComponent,
  ],
  templateUrl: './direcionamento-dialog.html',
  styleUrls: ['./direcionamento-dialog.scss'],
})
export class DirecionamentoDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DirecionamentoDialogComponent>);
  public data = inject<DirecionamentoDialogData>(MAT_DIALOG_DATA);
  private doacoesService = inject(DoacoesService);
  private locaisService = inject(LocaisService);
  private toast = inject(ToastService);

  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public loadingLocais = signal<boolean>(false);
  public locaisList = signal<Local[]>([]);

  // Limite máximo permitido para direcionamento nesta operação
  public maxPermitido = computed(() => {
    const doacao = this.data.doacao;
    const saldo = doacao.volume_disponivel ?? 0;
    if (this.isEditing() && this.data.direcionamento) {
      return Number((saldo + Number(this.data.direcionamento.volume)).toFixed(2));
    }
    return Number(saldo.toFixed(2));
  });

  public form = this.fb.nonNullable.group({
    id_local: [null as unknown as number, [Validators.required]],
    volume: [null as unknown as number, [Validators.required, Validators.min(0.01)]],
  });

  async ngOnInit(): Promise<void> {
    await this.carregarLocais();

    if (this.data.direcionamento) {
      this.isEditing.set(true);
      this.form.patchValue({
        id_local: this.data.direcionamento.id_local,
        volume: Number(this.data.direcionamento.volume),
      });
    }

    // Configura dinamicamente o validador de máximo
    this.form.controls.volume.addValidators(Validators.max(this.maxPermitido()));
    this.form.controls.volume.updateValueAndValidity();
  }

  private async carregarLocais(): Promise<void> {
    this.loadingLocais.set(true);
    try {
      const list = await this.locaisService.fetchLocais();
      this.locaisList.set(list);
    } catch {
      this.toast.error('Erro ao carregar lista de locais de acolhimento.');
    } finally {
      this.loadingLocais.set(false);
    }
  }

  alocarSaldoTotal(): void {
    const total = this.maxPermitido();
    this.form.controls.volume.setValue(total);
    this.form.controls.volume.markAsDirty();
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Informe um volume válido dentro do saldo disponível.');
      return;
    }

    const val = this.form.getRawValue();
    const volumeNumerico = Number(val.volume);

    if (volumeNumerico > this.maxPermitido()) {
      this.toast.error(
        `O volume informado (${volumeNumerico}) excede o saldo máximo de ${this.maxPermitido()} ${this.data.doacao.unidade_medida}.`,
      );
      return;
    }

    this.isSaving.set(true);
    try {
      if (this.isEditing() && this.data.direcionamento) {
        const updateDto: DirecionamentoUpdateDto = {
          id_local: Number(val.id_local),
          volume: volumeNumerico,
        };
        const updated = await this.doacoesService.updateDirecionamento(
          this.data.direcionamento.id,
          this.data.doacao.id,
          updateDto,
        );
        this.dialogRef.close(updated);
      } else {
        const createDto: DirecionamentoCreateDto = {
          id_doacao: this.data.doacao.id,
          id_local: Number(val.id_local),
          volume: volumeNumerico,
        };
        const created = await this.doacoesService.createDirecionamento(createDto);
        this.dialogRef.close(created);
      }
    } catch {
      // Erro tratado com toast no service
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
