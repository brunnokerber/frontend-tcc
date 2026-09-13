import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-veterinario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    FormErrorPipe,
    PhoneMaskDirective,
  ],
  templateUrl: './veterinario-form.html',
  styleUrls: ['./veterinario-form.scss'],
})
export default class VeterinarioFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private veterinariosService = inject(VeterinariosService);
  private toast = inject(ToastService);

  public isEditing = signal(false);
  public isLoading = signal(false);
  public isSaving = signal(false);
  public vetId = signal<number | null>(null);
  public existingVet = signal<Veterinario | null>(null);

  public vetForm = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(30)]],
    crvet: ['', [Validators.required, Validators.maxLength(30)]],
    telefone: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isEditing.set(true);
        this.vetId.set(id);
        this.loadVeterinarioData(id);
      }
    }
  }

  async loadVeterinarioData(id: number): Promise<void> {
    this.isLoading.set(true);
    const vet = await this.veterinariosService.getVeterinarioById(id);
    this.isLoading.set(false);

    if (!vet) {
      this.toast.error('Veterinário não encontrado.');
      this.router.navigate(['/veterinarios']);
      return;
    }

    this.existingVet.set(vet);
    this.vetForm.patchValue({
      nome: vet.nome,
      crvet: vet.crvet,
      telefone: formatPhone(vet.telefone),
    });
  }

  async onSubmit(): Promise<void> {
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
      if (this.isEditing() && this.vetId()) {
        const updateDto: VeterinarioUpdateDto = {
          nome: sanitize(formValues.nome) || '',
          crvet: sanitize(formValues.crvet) || '',
          telefone: rawDigitsPhone,
        };

        const updated = await this.veterinariosService.updateVeterinario(this.vetId()!, updateDto);
        if (updated) {
          this.router.navigate(['/veterinarios']);
        }
      } else {
        const createDto: VeterinarioCreateDto = {
          nome: sanitize(formValues.nome) || '',
          crvet: sanitize(formValues.crvet) || '',
          telefone: rawDigitsPhone,
        };

        const created = await this.veterinariosService.createVeterinario(createDto);
        if (created) {
          this.router.navigate(['/veterinarios']);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.isSaving.set(false);
    }
  }
}
