import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PetProcedimentosCardComponent } from './pet-procedimentos-card';
import { ConsultaExame, Pet } from '@features/pets/models/pet.model';

describe('PetProcedimentosCardComponent', () => {
  let component: PetProcedimentosCardComponent;
  let fixture: ComponentFixture<PetProcedimentosCardComponent>;

  const mockPet: Pet = {
    id: 5,
    nome: 'Belinha',
    tipo_pet: 'Gato',
    sexo: 'Fêmea',
    status: 'Disponível',
  };

  const mockConsultas: ConsultaExame[] = [
    {
      id: 201,
      id_pet: 5,
      operacao_medicamento: 'Hemograma Completo',
      tipo_operacao: 'Exame',
      data_realizacao: '2026-04-10',
      custo: 95,
      veterinario: { id: 8, nome: 'Dra. Camila', crmv: '54321' },
    },
    {
      id: 202,
      id_pet: 5,
      operacao_medicamento: 'Castração',
      tipo_operacao: 'Cirurgia',
      data_realizacao: '2026-04-20',
      custo: 250,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetProcedimentosCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PetProcedimentosCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pet', mockPet);
    fixture.componentRef.setInput('consultas', mockConsultas);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('isAdmin', true);
    fixture.detectChanges();
  });

  it('deve inicializar e exibir os procedimentos na tabela', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Hemograma Completo');
    expect(compiled.textContent).toContain('Castração');
    expect(compiled.textContent).toContain('Dra. Camila');
  });

  it('deve ordenar procedimentos por custo ao selecionar modo valor', () => {
    component.setSortMode('valor');
    const sorted = component.sortedConsultas();
    expect(sorted[0].custo).toBe(250);
    expect(sorted[1].custo).toBe(95);
  });

  it('deve emitir addProcedimento, editProcedimento e deleteProcedimento', () => {
    const addSpy = vi.fn();
    const editSpy = vi.fn();
    const deleteSpy = vi.fn();

    component.addProcedimento.subscribe(addSpy);
    component.editProcedimento.subscribe(editSpy);
    component.deleteProcedimento.subscribe(deleteSpy);

    component.onAdd();
    expect(addSpy).toHaveBeenCalledTimes(1);

    component.onEdit(mockConsultas[0]);
    expect(editSpy).toHaveBeenCalledWith(mockConsultas[0]);

    component.onDelete(mockConsultas[0]);
    expect(deleteSpy).toHaveBeenCalledWith(mockConsultas[0]);
  });

  it('deve exibir empty state quando não houver procedimentos cadastrados', () => {
    fixture.componentRef.setInput('consultas', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhum procedimento ou exame registrado');
  });
});
