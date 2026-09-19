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
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationService } from '@core/services/navigation.service';
import { ToastService } from '@core/services/toast.service';
import { FormErrorPipe } from '@shared/pipes/form-error.pipe';
import { DateMaskDirective } from '@shared/directives/date-mask.directive';
import { dateToIsoString, parseIsoToDate, sanitize } from '@shared/utils/string-utils';
import {
  calculateSenioridade,
  PORTE_OPTIONS,
  Pet,
  PetCreateDto,
  PetUpdateDto,
  SENIORIDADE_OPTIONS,
  SEXO_OPTIONS,
  STATUS_OPTIONS,
  TIPO_PET_OPTIONS,
} from '../../models/pet.model';
import { PetsService } from '../../services/pets.service';

@Component({
  selector: 'app-pet-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    FormErrorPipe,
    DateMaskDirective,
  ],
  templateUrl: './pet-form.html',
  styleUrls: ['./pet-form.scss'],
})
export default class PetFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavigationService);
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
  public senioridadeOptions = SENIORIDADE_OPTIONS;

  // Formulário Reativo
  public petForm = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(30)]],
    tipo_pet: ['Cachorro', [Validators.required, Validators.maxLength(10)]],
    sexo: ['Macho', [Validators.required, Validators.maxLength(10)]],
    status: ['Disponível', [Validators.required, Validators.maxLength(30)]],
    senioridade: ['Filhote', [Validators.required, Validators.maxLength(30)]],
    raca: ['', [Validators.required, Validators.maxLength(30)]],
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
    data_entrada: [new Date(), [Validators.required]],
    resgatante: ['', [Validators.required, Validators.maxLength(50)]],
    observacoes: ['', [Validators.maxLength(200)]],
  });

  ngOnInit() {
    // Atualização dinâmica da fase da vida / senioridade ao alterar data de nascimento
    this.petForm.controls.data_nascimento.valueChanges.subscribe((birthDate) => {
      const calculatedSenioridade = calculateSenioridade(birthDate);
      if (calculatedSenioridade) {
        this.petForm.controls.senioridade.setValue(calculatedSenioridade);
      }
    });

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
    this.petForm.controls.resgatante.clearValidators();
    this.petForm.controls.local_origem.updateValueAndValidity();
    this.petForm.controls.data_entrada.updateValueAndValidity();
    this.petForm.controls.resgatante.updateValueAndValidity();

    // Preencher dados do formulário
    const firstEntrada = pet.entradas && pet.entradas.length > 0 ? pet.entradas[0] : null;

    this.petForm.patchValue({
      nome: pet.nome,
      tipo_pet: pet.tipo_pet || 'Cachorro',
      sexo: pet.sexo || 'Macho',
      status: pet.status || 'Disponível',
      senioridade: pet.senioridade || 'Filhote',
      raca: pet.raca || '',
      porte: pet.porte || 'Médio',
      cor_majoritaria: pet.cor_majoritaria || '',
      moura: pet.moura || '',
      chip: pet.chip || '',
      rga: pet.rga || '',
      data_nascimento: parseIsoToDate(pet.data_nascimento),
      data_castracao: parseIsoToDate(pet.data_castracao),
      link_documentos: pet.link_documentos || '',
      local_origem: firstEntrada ? firstEntrada.local_origem : '',
      data_entrada: firstEntrada
        ? parseIsoToDate(firstEntrada.data_entrada) || new Date()
        : new Date(),
      resgatante: firstEntrada ? firstEntrada.resgatante : '',
      observacoes: firstEntrada ? firstEntrada.observacoes || '' : '',
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
          nome: formValues.nome?.trim() || '',
          tipo_pet: formValues.tipo_pet || 'Cachorro',
          sexo: formValues.sexo || 'Macho',
          status: formValues.status || 'Disponível',
          senioridade: formValues.senioridade?.trim() || 'Filhote',
          raca: formValues.raca?.trim() || 'Não informado',
          porte: sanitize(formValues.porte) || 'Médio',
          cor_majoritaria: formValues.cor_majoritaria?.trim() || 'Não informado',
          moura: sanitize(formValues.moura),
          chip: sanitize(formValues.chip),
          rga: sanitize(formValues.rga),
          data_nascimento: dateToIsoString(formValues.data_nascimento),
          data_castracao: dateToIsoString(formValues.data_castracao),
          link_documentos: sanitize(formValues.link_documentos),
        };

        const updated = await this.petsService.updatePet(this.petId()!, updateDto);
        if (updated) {
          this.goBack();
        }
      } else {
        const createDto: PetCreateDto = {
          nome: formValues.nome?.trim() || '',
          tipo_pet: formValues.tipo_pet || 'Cachorro',
          sexo: formValues.sexo || 'Macho',
          status: formValues.status || 'Disponível',
          senioridade: formValues.senioridade?.trim() || 'Filhote',
          raca: formValues.raca?.trim() || 'Não informado',
          porte: sanitize(formValues.porte) || 'Médio',
          cor_majoritaria: formValues.cor_majoritaria?.trim() || 'Não informado',
          moura: sanitize(formValues.moura),
          chip: sanitize(formValues.chip),
          rga: sanitize(formValues.rga),
          data_nascimento: dateToIsoString(formValues.data_nascimento),
          data_castracao: dateToIsoString(formValues.data_castracao),
          link_documentos: sanitize(formValues.link_documentos),
          local_origem: formValues.local_origem?.trim() || 'Não informado',
          data_entrada:
            dateToIsoString(formValues.data_entrada) || new Date().toISOString().split('T')[0],
          resgatante: formValues.resgatante?.trim() || 'Não informado',
          observacoes: sanitize(formValues.observacoes),
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

  goBack() {
    this.nav.back('/pets');
  }
}
