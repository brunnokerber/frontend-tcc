import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoacaoMonetaria } from '@features/doacoes/models/doacao-monetaria.model';
import { DoacoesMonetariasService } from '@features/doacoes/services/doacoes-monetarias.service';
import { DoacoesMonetariasTabComponent } from './doacoes-monetarias-tab';

describe('DoacoesMonetariasTabComponent', () => {
  let fixture: ComponentFixture<DoacoesMonetariasTabComponent>;
  let component: DoacoesMonetariasTabComponent;

  let doacoesMonetariasServiceMock: {
    doacoesMonetarias: ReturnType<typeof signal<DoacaoMonetaria[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    totalArrecadado: ReturnType<typeof signal<number>>;
    totalDoacoesCount: ReturnType<typeof signal<number>>;
    mediaPorDoacao: ReturnType<typeof signal<number>>;
    maiorDoacao: ReturnType<typeof signal<number>>;
    fetchDoacoesMonetarias: ReturnType<typeof vi.fn>;
    deleteDoacaoMonetaria: ReturnType<typeof vi.fn>;
  };

  let authServiceMock: {
    isAdmin: ReturnType<typeof signal<boolean>>;
  };

  let toastMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  let dialogMock: {
    open: ReturnType<typeof vi.fn>;
  };

  const mockDoacoesMonetarias: DoacaoMonetaria[] = [
    {
      id: 1,
      valor: 200.0,
      doador: 'Lucas Silva',
      telefone: '51988887777',
      data_doacao: '2026-10-24',
      observacoes: 'Doação para vacinas',
      created_at: '2026-10-24T11:00:00Z',
      updated_at: '2026-10-24T11:00:00Z',
    },
  ];

  beforeEach(() => {
    doacoesMonetariasServiceMock = {
      doacoesMonetarias: signal(mockDoacoesMonetarias),
      loading: signal(false),
      totalArrecadado: signal(200.0),
      totalDoacoesCount: signal(1),
      mediaPorDoacao: signal(200.0),
      maiorDoacao: signal(200.0),
      fetchDoacoesMonetarias: vi.fn().mockResolvedValue(mockDoacoesMonetarias),
      deleteDoacaoMonetaria: vi.fn().mockResolvedValue(true),
    };

    authServiceMock = {
      isAdmin: signal(true),
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    dialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    TestBed.configureTestingModule({
      imports: [DoacoesMonetariasTabComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DoacoesMonetariasService, useValue: doacoesMonetariasServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    }).overrideComponent(DoacoesMonetariasTabComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: dialogMock }],
      },
    });

    fixture = TestBed.createComponent(DoacoesMonetariasTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e carregar as doações monetárias', () => {
    expect(doacoesMonetariasServiceMock.fetchDoacoesMonetarias).toHaveBeenCalled();
    expect(component.totalDoacoesMonetarias()).toBe(1);
    expect(component.pagedDoacoesMonetarias().length).toBe(1);
  });

  it('deve formatar valor monetário e telefone', () => {
    expect(component.formatCurrency(150)).toContain('150,00');
    expect(component.formatPhone('51988887777')).toBe('(51) 98888-7777');
  });

  it('deve aplicar filtros e resetar página', () => {
    component.searchFieldMonetaria.set('doador');
    component.searchValueMonetaria.set('Lucas');
    component.pageIndexMonetaria.set(2);

    component.applyFiltersMonetaria(true);

    expect(component.pageIndexMonetaria()).toBe(0);
    expect(doacoesMonetariasServiceMock.fetchDoacoesMonetarias).toHaveBeenCalledWith({
      searchField: 'doador',
      searchValue: 'Lucas',
      dataInicio: undefined,
      dataFim: undefined,
    });
  });

  it('deve abrir modal de doação monetária', () => {
    component.openDoacaoMonetariaDialog();
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('deve excluir doação monetária se o usuário for administrador', () => {
    component.confirmDeleteDoacaoMonetaria(mockDoacoesMonetarias[0]);
    expect(dialogMock.open).toHaveBeenCalled();
    expect(doacoesMonetariasServiceMock.deleteDoacaoMonetaria).toHaveBeenCalledWith(1);
  });
});
