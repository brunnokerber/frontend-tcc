import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { provideNativeDateAdapter } from '@angular/material/core';
import { VacinaDialogComponent, VacinaDialogData } from './vacina-dialog';
import { VacinasService } from '../../services/vacinas.service';
import { VeterinariosService } from '@features/veterinarios/services/veterinarios.service';
import { PetsService } from '../../services/pets.service';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';

describe('VacinaDialogComponent', () => {
  let component: VacinaDialogComponent;
  let fixture: ComponentFixture<VacinaDialogComponent>;

  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockDialogData: VacinaDialogData = {
    vacina: {
      id: 1,
      id_pet: 67,
      nome_vacina: 'V8 (Óctupla Canina)',
      data_prevista: '2026-10-01',
      data_aplicacao: null,
      id_veterinario: null,
      custo: null,
      created_at: '2026-09-01T00:00:00Z',
    },
    pet: {
      id: 67,
      nome: 'Simba',
      tipo_pet: 'Cachorro',
      porte: 'Médio',
      status: 'Disponível',
    },
  };

  const mockVacinasService = {
    createVacina: vi.fn(),
    updateVacina: vi.fn(),
    deleteVacina: vi.fn(),
  };

  const mockVeterinariosService = {
    getVeterinarios: vi.fn().mockResolvedValue([]),
  };

  const mockPetsService = {
    getPets: vi.fn().mockResolvedValue([]),
    getPetById: vi.fn().mockResolvedValue(null),
  };

  const mockAuthService = {
    isAdmin: signal(true),
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  const mockMatDialog = {
    open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VacinaDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNativeDateAdapter(),
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: VacinasService, useValue: mockVacinasService },
        { provide: VeterinariosService, useValue: mockVeterinariosService },
        { provide: PetsService, useValue: mockPetsService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
        { provide: MatDialog, useValue: mockMatDialog },
      ],
    })
      .overrideComponent(VacinaDialogComponent, {
        add: {
          providers: [{ provide: MatDialog, useValue: mockMatDialog }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(VacinaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve instanciar o componente e inicializar o formulário', () => {
    expect(component).toBeTruthy();
    expect(component.isEditing()).toBe(true);
    expect(component.vacinaForm.controls.nome_vacina.value).toBe('V8 (Óctupla Canina)');
  });

  it('deve exibir o banner de status com classes tokenizadas para vacina prevista (pendente)', () => {
    const banner = fixture.nativeElement.querySelector('.status-banner-warning');
    expect(banner).toBeTruthy();

    const title = banner.querySelector('.text-surface-main');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('Vacina Prevista (Pendente)');

    const subtitle = banner.querySelector('.text-surface-muted');
    expect(subtitle).toBeTruthy();
    expect(subtitle?.textContent).toContain('Aguardando aplicação na data estipulada');
  });

  it('deve atualizar o banner para status de vacina aplicada ao marcar como aplicada hoje', () => {
    component.marcarComoAplicadaHoje();
    fixture.detectChanges();

    const bannerSuccess = fixture.nativeElement.querySelector('.status-banner-success');
    expect(bannerSuccess).toBeTruthy();

    const title = bannerSuccess.querySelector('.text-surface-main');
    expect(title?.textContent).toContain('Vacina Aplicada');
  });

  it('deve restaurar status de prevista ao limpar a aplicação', () => {
    component.marcarComoAplicadaHoje();
    fixture.detectChanges();

    component.limparAplicacao();
    fixture.detectChanges();

    const bannerWarning = fixture.nativeElement.querySelector('.status-banner-warning');
    expect(bannerWarning).toBeTruthy();
    expect(component.vacinaForm.controls.data_aplicacao.value).toBeNull();
  });

  it('deve adicionar e selecionar automaticamente o novo veterinário retornado pela modal sem novo GET', () => {
    const novoVet = { id: 99, nome: 'Dr. Teste', crmv: '12345' };
    mockMatDialog.open.mockReturnValueOnce({
      afterClosed: () => of(novoVet),
    });

    component.abrirNovoVetDialog();

    expect(component.veterinarios()).toContainEqual(novoVet);
    expect(component.vacinaForm.controls.id_veterinario.value).toBe(99);
    expect(mockToastService.info).toHaveBeenCalledWith(
      'Veterinário(a) "Dr. Teste" selecionado(a) automaticamente.',
    );
  });
});
