import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { Local } from '@features/locais/models/local.model';
import { LocaisService } from '@features/locais/services/locais.service';
import { Pet } from '../../models/pet.model';
import { PetsService } from '../../services/pets.service';
import { AdotarPetDialogComponent } from './adotar-pet-dialog';

describe('AdotarPetDialogComponent', () => {
  let component: AdotarPetDialogComponent;
  let fixture: ComponentFixture<AdotarPetDialogComponent>;

  const mockPet: Pet = {
    id: 67,
    nome: 'Simba',
    tipo_pet: 'Cachorro',
    sexo: 'Macho',
    status: 'Disponível',
    raca: 'SRD',
    porte: 'Médio',
  };

  const mockLocais: Local[] = [
    {
      id: 1,
      tipo_local: 'Lar Definitivo',
      local: 'Casa da Família Silva',
      contato: 'Carlos',
      telefone: '51999998888',
      rua: 'Rua das Palmeiras',
      numero: 100,
      bairro: 'Centro',
      cidade: 'Novo Hamburgo',
      estado: 'RS',
      cep: '93300000',
    },
  ];

  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockDialog = {
    open: vi.fn().mockReturnValue({
      afterClosed: () => of(null),
    }),
  };

  const mockPetsService = {
    adotarPet: vi.fn().mockResolvedValue(true),
  };

  const mockLocaisService = {
    fetchLocais: vi.fn().mockResolvedValue(mockLocais),
  };

  const mockToast = {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AdotarPetDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideNativeDateAdapter(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MAT_DIALOG_DATA, useValue: { pet: mockPet } },
        { provide: PetsService, useValue: mockPetsService },
        { provide: LocaisService, useValue: mockLocaisService },
        { provide: ToastService, useValue: mockToast },
      ],
    })
      .overrideComponent(AdotarPetDialogComponent, {
        set: {
          providers: [{ provide: MatDialog, useValue: mockDialog }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AdotarPetDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e carregar a lista de locais/adotantes', async () => {
    expect(component).toBeTruthy();
    expect(mockLocaisService.fetchLocais).toHaveBeenCalled();
    await fixture.whenStable();
    expect(component.locais().length).toBe(1);
    expect(component.locais()[0].local).toBe('Casa da Família Silva');
  });

  it('deve inicializar formulário com valores padrão e estado válido após selecionar local', async () => {
    await fixture.whenStable();
    expect(component.adocaoForm.valid).toBe(false); // falta id_local
    component.adocaoForm.controls.id_local.setValue(1);
    expect(component.adocaoForm.valid).toBe(true);
    expect(component.adocaoForm.controls.motivo_saida.value).toBe('Adoção Definitiva');
  });

  it('deve fechar diálogo ao cancelar', () => {
    component.onCancelar();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('deve registrar adoção com sucesso e fechar com true', async () => {
    await fixture.whenStable();
    component.adocaoForm.controls.id_local.setValue(1);
    component.adocaoForm.controls.valor_auxilio.setValue(150);

    await component.onConfirmar();

    expect(mockPetsService.adotarPet).toHaveBeenCalledWith(
      67,
      expect.objectContaining({
        id_local: 1,
        motivo_saida: 'Adoção Definitiva',
        valor_auxilio: 150,
      }),
    );
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('deve exibir mensagem de erro se a procedure de adoção falhar', async () => {
    await fixture.whenStable();
    mockPetsService.adotarPet.mockRejectedValueOnce(new Error('Animal não disponível para adoção'));

    component.adocaoForm.controls.id_local.setValue(1);
    await component.onConfirmar();

    expect(component.errorMessage()).toBe('Animal não disponível para adoção');
    expect(mockDialogRef.close).not.toHaveBeenCalledWith(true);
  });

  it('deve abrir modal de cadastro de novo local ao clicar em novo', () => {
    mockDialog.open.mockReturnValueOnce({
      afterClosed: () =>
        of({
          id: 2,
          local: 'Novo Adotante',
          tipo_local: 'Lar Definitivo',
        }),
    });

    component.abrirNovoLocalDialog();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(component.locais().some((l) => l.id === 2)).toBe(true);
    expect(component.adocaoForm.controls.id_local.value).toBe(2);
  });
});
