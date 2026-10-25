import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StatCardComponent } from './stat-card';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
  });

  it('deve instanciar o componente com sucesso', () => {
    expect(component).toBeTruthy();
  });

  it('deve aplicar as classes corretas para a variante purple (Administrador)', () => {
    fixture.componentRef.setInput('label', 'Administradores');
    fixture.componentRef.setInput('value', 3);
    fixture.componentRef.setInput('icon', 'admin_panel_settings');
    fixture.componentRef.setInput('variant', 'purple');
    fixture.detectChanges();

    expect(component.resolvedValueClass()).toBe('text-role-admin');
    expect(component.resolvedIconWrapperClass()).toBe('bg-role-admin');
  });

  it('deve aplicar as classes corretas para a variante info (Operadores)', () => {
    fixture.componentRef.setInput('label', 'Operadores');
    fixture.componentRef.setInput('value', 12);
    fixture.componentRef.setInput('icon', 'assignment_ind');
    fixture.componentRef.setInput('variant', 'info');
    fixture.detectChanges();

    expect(component.resolvedValueClass()).toBe('text-status-info');
    expect(component.resolvedIconWrapperClass()).toBe('bg-status-info');
  });

  it('deve aplicar classes customizadas quando fornecidas via inputs', () => {
    fixture.componentRef.setInput('label', 'Personalizado');
    fixture.componentRef.setInput('value', 100);
    fixture.componentRef.setInput('icon', 'star');
    fixture.componentRef.setInput('valueClass', 'my-custom-value');
    fixture.componentRef.setInput('iconClass', 'my-custom-icon');
    fixture.detectChanges();

    expect(component.resolvedValueClass()).toBe('my-custom-value');
    expect(component.resolvedIconWrapperClass()).toBe('my-custom-icon');
  });

  it('deve resolver classes padrão para variante primary', () => {
    fixture.componentRef.setInput('label', 'Padrão');
    fixture.componentRef.setInput('value', 5);
    fixture.componentRef.setInput('icon', 'pets');
    fixture.detectChanges();

    expect(component.resolvedValueClass()).toBe('text-surface-main');
    expect(component.resolvedIconWrapperClass()).toBe('bg-status-primary');
  });
});
