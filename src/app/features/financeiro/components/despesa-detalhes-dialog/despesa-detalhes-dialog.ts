import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { AuditBadgeComponent } from '@shared/components/audit-badge/audit-badge';
import { DialogLayoutComponent } from '@shared/components/dialog-layout/dialog-layout';
import { PhonePipe } from '@shared/pipes/phone.pipe';
import { Despesa } from '../../models/despesa.model';

export interface DespesaDetalhesDialogData {
  despesa: Despesa;
  isAdmin?: boolean;
}

export type DespesaDetalhesDialogResult = 'edit' | 'close';

@Component({
  selector: 'app-despesa-detalhes-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DialogLayoutComponent,
    AuditBadgeComponent,
    PhonePipe,
  ],
  templateUrl: './despesa-detalhes-dialog.html',
  styleUrls: ['./despesa-detalhes-dialog.scss'],
})
export class DespesaDetalhesDialogComponent {
  private dialogRef = inject(
    MatDialogRef<DespesaDetalhesDialogComponent, DespesaDetalhesDialogResult>,
  );
  public data = inject<DespesaDetalhesDialogData>(MAT_DIALOG_DATA);
  private authService = inject(AuthService);

  public despesa = computed<Despesa>(() => this.data.despesa);
  public isAdmin = computed<boolean>(() => this.data?.isAdmin ?? this.authService.isAdmin());

  onClose(): void {
    this.dialogRef.close('close');
  }

  onEdit(): void {
    this.dialogRef.close('edit');
  }
}
