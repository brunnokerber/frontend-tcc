import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PetVacinasCardComponent } from './pet-vacinas-card';
import { Pet, Vacina } from '@features/pets/models/pet.model';

describe('PetVacinasCardComponent', () => {
  let component: PetVacinasCardComponent;
  let fixture: ComponentFixture<PetVacinasCardComponent>;

  const mockPet: Pet = {
    id: 1,
    nome: 'Max',
    tipo_pet: 'Cachorro',
    sexo: 'Macho',
    status: 'Disponível',
  };

  const mockVacinas: Vacina[] = [
    {
      id: 101,
      id_pet: 1,
      nome_vacina: 'Antirrábica',
      data_prevista: '2026-05-10',
      data_aplicacao: '2026-05-12',
      custo: 80,
      veterinario: { id: 10, nome: 'Dr. Lucas', crmv: '12345' },
    },
    {
      id: 102,
      id_pet: 1,
      nome_vacina: 'V10 Múltipla',
      data_prevista: '2026-06-01',
      custo: 120,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetVacinasCardComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PetVacinasCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pet', mockPet);
    fixture.componentRef.setInput('vacinas', mockVacinas);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('isAdmin', true);
    fixture.detectChanges();
  });

  it('deve inicializar e exibir a lista de vacinas na tabela', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Antirrábica');
    expect(compiled.textContent).toContain('V10 Múltipla');
    expect(compiled.textContent).toContain('Dr. Lucas');
    expect(compiled.textContent).toContain('Pendente');
  });

  it('deve ordenar vacinas por custo ao selecionar modo valor', () => {
    component.setSortMode('valor');
    const sorted = component.sortedVacinas();
    expect(sorted[0].custo).toBe(120);
    expect(sorted[1].custo).toBe(80);
  });

  it('deve emitir addVacina, editVacina e deleteVacina', () => {
    const addSpy = vi.fn();
    const editSpy = vi.fn();
    const deleteSpy = vi.fn();

    component.addVacina.subscribe(addSpy);
    component.editVacina.subscribe(editSpy);
    component.deleteVacina.subscribe(deleteSpy);

    component.onAdd();
    expect(addSpy).toHaveBeenCalledTimes(1);

    component.onEdit(mockVacinas[0]);
    expect(editSpy).toHaveBeenCalledWith(mockVacinas[0]);

    component.onDelete(mockVacinas[0]);
    expect(deleteSpy).toHaveBeenCalledWith(mockVacinas[0]);
  });

  it('deve exibir empty state quando não houver vacinas', () => {
    fixture.componentRef.setInput('vacinas', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhuma vacina registrada');
  });
});
