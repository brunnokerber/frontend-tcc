import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '@core/services/toast.service';
import { Pet } from '@features/pets/models/pet.model';

import { AuditBadgeComponent } from '@shared/components/audit-badge/audit-badge';

@Component({
  selector: 'app-pet-info-card',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditBadgeComponent,
  ],
  templateUrl: './pet-info-card.html',
  styleUrls: ['./pet-info-card.scss'],
})
export class PetInfoCardComponent {
  private toast = inject(ToastService);

  public pet = input.required<Pet>();
  public edit = output<void>();

  onEdit(): void {
    this.edit.emit();
  }

  async copyUuid(uuid: string | null | undefined, label = 'ID'): Promise<void> {
    if (!uuid) return;
    try {
      await navigator.clipboard.writeText(uuid);
      this.toast.success(`${label} copiado para a área de transferência!`);
    } catch {
      this.toast.error(`Falha ao copiar ${label}.`);
    }
  }
}
