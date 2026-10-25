import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PetDetailComponent from './pet-detail';
import { AuthService } from '@core/auth/services/auth.service';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';
import { NavigationService } from '@core/services/navigation.service';
import { ToastService } from '@core/services/toast.service';
import { PetsService } from '../../services/pets.service';
import { VacinasService } from '../../services/vacinas.service';
import { ConsultasExamesService } from '../../services/consultas-exames.service';
import { PetsLocaisService } from '../../services/pets-locais.service';
import { ConsultaExame, Pet, PetLocal, Vacina } from '../../models/pet.model';

describe('PetDetailComponent', () => {
  let component: PetDetailComponent;
  let fixture: ComponentFixture<PetDetailComponent>;

  const mockPet: Pet = {
    id: 1,
    nome: 'Rex',
    tipo_pet: 'Cachorro',
    sexo: 'Macho',
    status: 'Disponível',
    foto_url: 'pets/rex.jpg',
    entradas: [
      {
        id: 1,
        id_pet: 1,
        data_entrada: '2026-01-01',
        local_origem: 'Centro',
        resgatante: 'Maria',
      },
    ],
  };

  const mockVacinas: Vacina[] = [
    { id: 10, id_pet: 1, nome_vacina: 'V10', custo: 100, data_aplicacao: '2026-02-01' },
  ];

  const mockConsultas: ConsultaExame[] = [
    {
      id: 20,
      id_pet: 1,
      operacao_medicamento: 'Consulta Geral',
      custo: 150,
      data_realizacao: '2026-02-15',
    },
  ];

  const mockLocais: PetLocal[] = [
    { id: 30, id_pet: 1, id_local: 5, valor_auxilio: 200, data_saida: '2026-03-01' },
  ];

  const cachedPetSignal = signal<Pet | null>(mockPet);
  const loadingPetSignal = signal<boolean>(false);
  const vacinasSignal = signal<Vacina[]>(mockVacinas);
  const loadingVacinasSignal = signal<boolean>(false);
  const consultasSignal = signal<ConsultaExame[]>(mockConsultas);
  const loadingConsultasSignal = signal<boolean>(false);
  const locaisSignal = signal<PetLocal[]>(mockLocais);
  const loadingLocaisSignal = signal<boolean>(false);

  const mockPetsService = {
    cachedPet: cachedPetSignal,
    loading: loadingPetSignal,
    getPetById: vi.fn(),
    getSignedFotoUrl: vi.fn().mockResolvedValue('https://signed.url/rex.jpg'),
  };

  const mockVacinasService = {
    vacinas: vacinasSignal,
    loading: loadingVacinasSignal,
    getVacinasByPetId: vi.fn(),
    deleteVacina: vi.fn().mockResolvedValue(true),
  };

  const mockConsultasService = {
    consultas: consultasSignal,
    loading: loadingConsultasSignal,
    getConsultasExamesByPetId: vi.fn(),
    deleteConsultaExame: vi.fn().mockResolvedValue(true),
  };

  const mockPetsLocaisService = {
    petsLocais: locaisSignal,
    loading: loadingLocaisSignal,
    getPetsLocaisByPetId: vi.fn(),
  };

  const mockAuthService = {
    isAdmin: signal(true),
  };

  const mockToast = {
    error: vi.fn(),
    success: vi.fn(),
  };

  const mockNav = {
    back: vi.fn(),
  };

  const mockDialog = {
    open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
  };

  let router: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    cachedPetSignal.set(mockPet);

    await TestBed.configureTestingModule({
      imports: [PetDetailComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PetsService, useValue: mockPetsService },
        { provide: VacinasService, useValue: mockVacinasService },
        { provide: ConsultasExamesService, useValue: mockConsultasService },
        { provide: PetsLocaisService, useValue: mockPetsLocaisService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToast },
        { provide: NavigationService, useValue: mockNav },
        { provide: MatDialog, useValue: mockDialog },
        {
          provide: AuditResolverService,
          useValue: { resolveUser: vi.fn().mockResolvedValue(null) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '1' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(PetDetailComponent, {
        add: {
          providers: [{ provide: MatDialog, useValue: mockDialog }],
        },
      })
      .compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(PetDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e carregar dados do pet e subcoleções', () => {
    expect(component).toBeTruthy();
    expect(mockPetsService.getPetById).toHaveBeenCalledWith(1, false);
    expect(mockVacinasService.getVacinasByPetId).toHaveBeenCalledWith(1, false);
    expect(mockConsultasService.getConsultasExamesByPetId).toHaveBeenCalledWith(1, false);
    expect(mockPetsLocaisService.getPetsLocaisByPetId).toHaveBeenCalledWith(1, false);
  });

  it('deve calcular corretamente as métricas financeiras investidas', () => {
    expect(component.totalCustoVacinas()).toBe(100);
    expect(component.totalCustoConsultas()).toBe(150);
    expect(component.totalCustoAuxilio()).toBe(200);
    expect(component.totalInvestidoGeral()).toBe(450);
  });

  it('deve navegar para a edição do pet ao chamar goToEdit', () => {
    component.goToEdit();
    expect(router.navigate).toHaveBeenCalledWith(['/pets', 1, 'editar'], {
      state: { pet: mockPet },
    });
  });

  it('deve navegar de volta ao chamar goBack', () => {
    component.goBack();
    expect(mockNav.back).toHaveBeenCalledWith('/pets');
  });

  it('deve abrir modal de confirmação para exclusão de vacina', async () => {
    component.confirmDeleteVacina(mockVacinas[0]);
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockVacinasService.deleteVacina).toHaveBeenCalledWith(10);
  });

  it('deve abrir modal de confirmação para exclusão de procedimento', async () => {
    component.confirmDeleteProcedimento(mockConsultas[0]);
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockConsultasService.deleteConsultaExame).toHaveBeenCalledWith(20);
  });

  it('deve abrir modal de registro de adoção ao chamar openAdotarModal', () => {
    component.openAdotarModal();
    expect(mockDialog.open).toHaveBeenCalled();
  });
});
