import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PetInfoCardComponent } from './pet-info-card';
import { Pet } from '@features/pets/models/pet.model';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/auth/services/auth.service';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';

describe('PetInfoCardComponent', () => {
  let component: PetInfoCardComponent;
  let fixture: ComponentFixture<PetInfoCardComponent>;
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const mockAuthService = {
    isAdmin: vi.fn().mockReturnValue(true),
  };

  const mockAuditResolver = {
    resolveUser: vi.fn().mockResolvedValue(null),
  };

  const mockPet: Pet = {
    id: 10,
    nome: 'Thor',
    tipo_pet: 'Cachorro',
    sexo: 'Macho',
    status: 'Em Tratamento',
    raca: 'Labrador',
    porte: 'Grande',
    cor_majoritaria: 'Caramelo',
    data_nascimento: '2023-05-10',
    senioridade: 'Adulto',
    chip: '123456789',
    rga: 'RGA-99',
    moura: 'M-12',
    link_documentos: 'https://drive.google.com/doc',
    created_at: '2025-06-01T12:00:00Z',
    updated_at: '2025-06-02T14:00:00Z',
    updated_by: '00000000-0000-0000-0000-000000000001',
    editor: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'editor@ong.org',
      role: 'admin',
    },
    entradas: [
      {
        id: 1,
        id_pet: 10,
        data_entrada: '2025-06-01',
        local_origem: 'Rua das Flores, 123',
        resgatante: 'Voluntário João',
        observacoes: 'Resgatado com ferimento na pata',
      },
    ],
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [PetInfoCardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ToastService, useValue: mockToast },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditResolverService, useValue: mockAuditResolver },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PetInfoCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pet', mockPet);
    fixture.detectChanges();
  });

  it('deve inicializar e exibir as subseções cadastrais', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Thor');
    expect(compiled.textContent).toContain('Labrador');
    expect(compiled.textContent).toContain('Adulto');
    expect(compiled.textContent).toContain('Voluntário João');
    expect(compiled.textContent).toContain('00000000');
  });

  it('deve emitir evento de edição', () => {
    const editSpy = vi.fn();
    component.edit.subscribe(editSpy);

    component.onEdit();
    expect(editSpy).toHaveBeenCalledTimes(1);
  });

  it('deve copiar UUID e exibir feedback via toast', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    await component.copyUuid(mockPet.updated_by, 'ID do editor');
    expect(writeTextSpy).toHaveBeenCalledWith(mockPet.updated_by);
    expect(mockToast.success).toHaveBeenCalledWith(
      'ID do editor copiado para a área de transferência!',
    );
  });
});
