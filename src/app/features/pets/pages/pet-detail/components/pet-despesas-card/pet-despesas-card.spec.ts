import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PetDespesasCardComponent } from './pet-despesas-card';
import { Pet } from '@features/pets/models/pet.model';
import { Despesa } from '@features/financeiro/models/despesa.model';

describe('PetDespesasCardComponent', () => {
  let component: PetDespesasCardComponent;
  let fixture: ComponentFixture<PetDespesasCardComponent>;

  const mockPet: Pet = {
    id: 1,
    nome: 'Thor',
    tipo_pet: 'Cachorro',
    sexo: 'Macho',
    status: 'Disponível',
  };

  const mockDespesas: Despesa[] = [
    {
      id: 201,
      descricao: 'Ração Medicamentosa Hepática',
      categoria: 'Alimentação',
      valor: 250,
      data_despesa: '2026-06-10',
      favorecido: 'Agropecuária Vale',
      telefone: '51999998888',
      id_pet: 1,
      observacoes: 'Uso contínuo por 30 dias',
    },
    {
      id: 202,
      descricao: 'Exame de Ultrassom Abdominal',
      categoria: 'Procedimentos Clínicos',
      valor: 400,
      data_despesa: '2026-06-15',
      favorecido: 'Clínica Vet Care',
      id_pet: 1,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetDespesasCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PetDespesasCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pet', mockPet);
    fixture.componentRef.setInput('despesas', mockDespesas);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('isAdmin', true);
    fixture.detectChanges();
  });

  it('deve inicializar e exibir a lista de despesas na tabela', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ração Medicamentosa Hepática');
    expect(compiled.textContent).toContain('Exame de Ultrassom Abdominal');
    expect(compiled.textContent).toContain('Agropecuária Vale');
    expect(compiled.textContent).toContain('Clínica Vet Care');
  });

  it('deve calcular corretamente o total de despesas vinculadas', () => {
    expect(component.totalDespesas()).toBe(650);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('R$');
  });

  it('deve ordenar despesas por valor decrescente quando selecionado o modo "valor"', () => {
    component.setSortMode('valor');
    fixture.detectChanges();

    const sorted = component.sortedDespesas();
    expect(sorted[0].id).toBe(202); // 400
    expect(sorted[1].id).toBe(201); // 250
  });

  it('deve emitir o evento addDespesa ao clicar no botão de adicionar', () => {
    const spy = vi.fn();
    component.addDespesa.subscribe(spy);

    component.onAdd();
    expect(spy).toHaveBeenCalled();
  });

  it('deve emitir o evento editDespesa ao clicar em editar', () => {
    const spy = vi.fn();
    component.editDespesa.subscribe(spy);

    component.onEdit(mockDespesas[0]);
    expect(spy).toHaveBeenCalledWith(mockDespesas[0]);
  });

  it('deve emitir o evento viewDespesa ao clicar em visualizar detalhes', () => {
    const spy = vi.fn();
    component.viewDespesa.subscribe(spy);

    component.onView(mockDespesas[0]);
    expect(spy).toHaveBeenCalledWith(mockDespesas[0]);
  });

  it('deve emitir o evento deleteDespesa ao clicar em excluir', () => {
    const spy = vi.fn();
    component.deleteDespesa.subscribe(spy);

    const event = new MouseEvent('click');
    component.onDelete(mockDespesas[0], event);
    expect(spy).toHaveBeenCalledWith(mockDespesas[0]);
  });

  it('deve exibir mensagem de estado vazio quando não houver despesas', () => {
    fixture.componentRef.setInput('despesas', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhuma despesa da ONG vinculada');
  });
});
