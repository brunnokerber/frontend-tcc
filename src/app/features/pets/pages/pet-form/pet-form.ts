import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import {
  PORTE_OPTIONS,
  Pet,
  PetCreateDto,
  PetUpdateDto,
  SEXO_OPTIONS,
  STATUS_OPTIONS,
  TIPO_PET_OPTIONS
} from '../../models/pet.model';
import { PetsService } from '../../services/pets.service';

@Component({
  selector: 'app-pet-form',
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
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    FormErrorPipe
  ],
  templateUrl: './pet-form.html',
  styleUrls: ['./pet-form.scss']
})
export default class PetFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private petsService = inject(PetsService);
  private toast = inject(ToastService);

  // Estados com Signals
  public isEditing = signal(false);
  public isLoading = signal(false);
  public isSaving = signal(false);
  public petId = signal<number | null>(null);
  public existingPet = signal<Pet | null>(null);

  // Opções para os Selects
  public tipoOptions = TIPO_PET_OPTIONS;
  public sexoOptions = SEXO_OPTIONS;
  public statusOptions = STATUS_OPTIONS;
  public porteOptions = PORTE_OPTIONS;

  // Formulário Reativo
  public petForm = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(30)]],
    tipo_pet: ['Cachorro', [Validators.required, Validators.maxLength(10)]],
    sexo: ['Macho', [Validators.required, Validators.maxLength(10)]],
    status: ['Disponível', [Validators.required, Validators.maxLength(30)]],
    porte: ['Médio', [Validators.maxLength(30)]],
    cor_majoritaria: ['', [Validators.maxLength(30)]],
    moura: ['', [Validators.maxLength(30)]],
    chip: ['', [Validators.maxLength(30)]],
    rga: ['', [Validators.maxLength(30)]],
    data_nascimento: [null as Date | null],
    data_castracao: [null as Date | null],
    link_documentos: ['', [Validators.maxLength(200)]],
    // Campos da tabela 'entradas' (obrigatórios na criação)
    local_origem: ['', [Validators.required, Validators.maxLength(50)]],
    data_entrada: [new Date(), [Validators.required]]
  });

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isEditing.set(true);
        this.petId.set(id);
        this.loadPetData(id);
      }
    }
  }

  private parseIsoToDate(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  private formatDateToIso(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (typeof val === 'string' && val.trim()) {
      return val.split('T')[0];
    }
    return null;
  }

  async loadPetData(id: number) {
    this.isLoading.set(true);
    const pet = await this.petsService.getPetById(id);
    this.isLoading.set(false);

    if (!pet) {
      this.toast.error('Pet não encontrado.');
      this.router.navigate(['/pets']);
      return;
    }

    this.existingPet.set(pet);

    // Desabilitar validação de entrada na edição se não for necessária
    this.petForm.controls.local_origem.clearValidators();
    this.petForm.controls.data_entrada.clearValidators();
    this.petForm.controls.local_origem.updateValueAndValidity();
    this.petForm.controls.data_entrada.updateValueAndValidity();

    // Preencher dados do formulário
    const firstEntrada = pet.entradas && pet.entradas.length > 0 ? pet.entradas[0] : null;

    this.petForm.patchValue({
      nome: pet.nome,
      tipo_pet: pet.tipo_pet || 'Cachorro',
      sexo: pet.sexo || 'Macho',
      status: pet.status || 'Disponível',
      porte: pet.porte || 'Médio',
      cor_majoritaria: pet.cor_majoritaria || '',
      moura: pet.moura || '',
      chip: pet.chip || '',
      rga: pet.rga || '',
      data_nascimento: this.parseIsoToDate(pet.data_nascimento),
      data_castracao: this.parseIsoToDate(pet.data_castracao),
      link_documentos: pet.link_documentos || '',
      local_origem: firstEntrada ? firstEntrada.local_origem : '',
      data_entrada: firstEntrada ? (this.parseIsoToDate(firstEntrada.data_entrada) || new Date()) : new Date()
    });
  }

  async onSubmit() {
    if (this.petForm.invalid) {
      this.petForm.markAllAsTouched();
      this.toast.warning('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const formValues = this.petForm.getRawValue();
    this.isSaving.set(true);

    try {
      if (this.isEditing() && this.petId()) {
        const updateDto: PetUpdateDto = {
          nome: formValues.nome || '',
          tipo_pet: formValues.tipo_pet || 'Cachorro',
          sexo: formValues.sexo || 'Macho',
          status: formValues.status || 'Disponível',
          porte: formValues.porte || 'Médio',
          cor_majoritaria: formValues.cor_majoritaria || null,
          moura: formValues.moura || null,
          chip: formValues.chip || null,
          rga: formValues.rga || null,
          data_nascimento: this.formatDateToIso(formValues.data_nascimento),
          data_castracao: this.formatDateToIso(formValues.data_castracao),
          link_documentos: formValues.link_documentos || null
        };

        const updated = await this.petsService.updatePet(this.petId()!, updateDto);
        if (updated) {
          this.router.navigate(['/pets']);
        }
      } else {
        const createDto: PetCreateDto = {
          nome: formValues.nome || '',
          tipo_pet: formValues.tipo_pet || 'Cachorro',
          sexo: formValues.sexo || 'Macho',
          status: formValues.status || 'Disponível',
          porte: formValues.porte || 'Médio',
          cor_majoritaria: formValues.cor_majoritaria || null,
          moura: formValues.moura || null,
          chip: formValues.chip || null,
          rga: formValues.rga || null,
          data_nascimento: this.formatDateToIso(formValues.data_nascimento),
          data_castracao: this.formatDateToIso(formValues.data_castracao),
          link_documentos: formValues.link_documentos || null,
          local_origem: formValues.local_origem || 'Não informado',
          data_entrada: this.formatDateToIso(formValues.data_entrada) || new Date().toISOString().split('T')[0]
        };

        const created = await this.petsService.createPet(createDto);
        if (created) {
          this.router.navigate(['/pets']);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.isSaving.set(false);
    }
  }
}
