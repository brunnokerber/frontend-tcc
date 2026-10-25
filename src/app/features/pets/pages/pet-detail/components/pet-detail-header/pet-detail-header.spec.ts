import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PetDetailHeaderComponent } from './pet-detail-header';
import { Pet } from '@features/pets/models/pet.model';

import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';
import { ToastService } from '@core/services/toast.service';

describe('PetDetailHeaderComponent', () => {
  let component: PetDetailHeaderComponent;
  let fixture: ComponentFixture<PetDetailHeaderComponent>;

  const mockPet: Pet = {
    id: 42,
    nome: 'Pipoca',
    tipo_pet: 'Cachorro',
    sexo: 'Fêmea',
    status: 'Disponível',
    porte: 'Médio',
    raca: 'SRD',
    chip: '98200041234',
    created_at: '2026-01-15T10:00:00Z',
    link_documentos: 'https://drive.google.com/docs',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetDetailHeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { isAdmin: () => true } },
        {
          provide: AuditResolverService,
          useValue: { resolveUser: vi.fn().mockResolvedValue(null) },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PetDetailHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pet', mockPet);
    fixture.componentRef.setInput('fotoUrl', 'https://storage/pipoca.jpg');
    fixture.componentRef.setInput('totalInvestidoGeral', 650);
    fixture.componentRef.setInput('totalCustoVacinas', 250);
    fixture.componentRef.setInput('totalCustoConsultas', 300);
    fixture.componentRef.setInput('totalCustoAuxilio', 100);
    fixture.componentRef.setInput('diasNoAbrigo', 45);
    fixture.detectChanges();
  });

  it('deve inicializar e exibir cabeçalho com nome, status e métricas', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pipoca');
    expect(compiled.textContent).toContain('Disponível');
    expect(compiled.textContent).toContain('45 dias');
    expect(compiled.textContent).toContain('Chip: 98200041234');
  });

  it('deve emitir evento de voltar', () => {
    const backSpy = vi.fn();
    component.back.subscribe(backSpy);

    component.onBack();
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('deve emitir evento de adotar pet', () => {
    const adotarSpy = vi.fn();
    component.adotar.subscribe(adotarSpy);

    component.onAdotar();
    expect(adotarSpy).toHaveBeenCalledTimes(1);
  });

  it('deve emitir evento de preview de foto', () => {
    const previewSpy = vi.fn();
    component.photoPreview.subscribe(previewSpy);

    component.onPhotoClick('https://storage/pipoca.jpg', 'Pipoca');
    expect(previewSpy).toHaveBeenCalledWith({
      url: 'https://storage/pipoca.jpg',
      nome: 'Pipoca',
    });
  });
});
