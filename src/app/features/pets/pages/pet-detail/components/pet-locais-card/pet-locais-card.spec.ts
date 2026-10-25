import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PetLocaisCardComponent } from './pet-locais-card';
import { Pet, PetLocal } from '@features/pets/models/pet.model';

describe('PetLocaisCardComponent', () => {
  let component: PetLocaisCardComponent;
  let fixture: ComponentFixture<PetLocaisCardComponent>;

  const mockPet: Pet = {
    id: 3,
    nome: 'Bob',
    tipo_pet: 'Cachorro',
    sexo: 'Macho',
    status: 'Disponível',
  };

  const mockLocais: PetLocal[] = [
    {
      id: 301,
      id_pet: 3,
      id_local: 12,
      data_saida: '2026-03-01',
      data_reentrada: '2026-03-15',
      motivo_saida: 'Hospedagem Temporária',
      valor_auxilio: 150,
      obs: 'Adaptação excelente com outros cães',
      locais: {
        id: 12,
        local: 'Lar da Ana',
        tipo_local: 'Lar Temporário',
      },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetLocaisCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PetLocaisCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pet', mockPet);
    fixture.componentRef.setInput('locais', mockLocais);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
  });

  it('deve inicializar e exibir a timeline de passagens por locais', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Lar da Ana');
    expect(compiled.textContent).toContain('Lar Temporário');
    expect(compiled.textContent).toContain('Auxílio:');
    expect(compiled.textContent).toContain('Adaptação excelente');
  });

  it('deve emitir addLocal e editLocal', () => {
    const addSpy = vi.fn();
    const editSpy = vi.fn();

    component.addLocal.subscribe(addSpy);
    component.editLocal.subscribe(editSpy);

    component.onAdd();
    expect(addSpy).toHaveBeenCalledTimes(1);

    component.onEdit(mockLocais[0]);
    expect(editSpy).toHaveBeenCalledWith(mockLocais[0]);
  });

  it('deve exibir empty state quando não houver locais de passagem', () => {
    fixture.componentRef.setInput('locais', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhum histórico de local de passagem');
  });
});
