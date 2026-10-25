import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  getSexoIcon,
  getStatusBadgeClass,
  getTipoBadgeClass,
  getTipoFaIcon,
  Pet,
} from '@features/pets/models/pet.model';

import { AuditBadgeComponent } from '@shared/components/audit-badge/audit-badge';

@Component({
  selector: 'app-pet-detail-header',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditBadgeComponent,
  ],
  templateUrl: './pet-detail-header.html',
  styleUrls: ['./pet-detail-header.scss'],
})
export class PetDetailHeaderComponent {
  public pet = input.required<Pet>();
  public fotoUrl = input<string | null>(null);
  public totalInvestidoGeral = input<number>(0);
  public totalCustoVacinas = input<number>(0);
  public totalCustoConsultas = input<number>(0);
  public totalCustoAuxilio = input<number>(0);
  public diasNoAbrigo = input<number | null>(null);

  public back = output<void>();
  public adotar = output<void>();
  public photoPreview = output<{ url: string; nome: string }>();

  readonly getStatusBadgeClass = getStatusBadgeClass;
  readonly getTipoBadgeClass = getTipoBadgeClass;
  readonly getTipoFaIcon = getTipoFaIcon;
  readonly getSexoIcon = getSexoIcon;

  onBack(): void {
    this.back.emit();
  }

  onAdotar(): void {
    this.adotar.emit();
  }

  onPhotoClick(url: string, nome: string): void {
    this.photoPreview.emit({ url, nome });
  }
}
