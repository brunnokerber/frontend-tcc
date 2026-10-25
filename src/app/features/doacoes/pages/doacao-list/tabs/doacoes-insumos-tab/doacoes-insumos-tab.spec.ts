import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Doacao, DoacaoStatus } from '@features/doacoes/models/doacao.model';
import { DoacoesService } from '@features/doacoes/services/doacoes.service';
import { DoacoesInsumosTabComponent } from './doacoes-insumos-tab';

describe('DoacoesInsumosTabComponent', () => {
  let fixture: ComponentFixture<DoacoesInsumosTabComponent>;
  let component: DoacoesInsumosTabComponent;

  let doacoesServiceMock: {
    doacoes: ReturnType<typeof signal<Doacao[]>>;
    direcionamentos: ReturnType<typeof signal<unknown[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    fetchDoacoes: ReturnType<typeof vi.fn>;
    fetchDirecionamentos: ReturnType<typeof vi.fn>;
    deleteDoacao: ReturnType<typeof vi.fn>;
    deleteDirecionamento: ReturnType<typeof vi.fn>;
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

  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const mockDoacoes: Doacao[] = [
    {
      id: 1,
      tipo_doacao: 'Ração',
      volume: 100,
      doador: 'Pet Shop Bicho Bom',
      telefone: '51999991111',
      unidade_medida: 'kg',
      volume_direcionado: 40,
      volume_disponivel: 60,
      percentual_direcionado: 40,
      status: 'parcial' as DoacaoStatus,
      created_at: '2026-10-24T10:00:00Z',
      updated_at: '2026-10-24T10:00:00Z',
    },
  ];

  beforeEach(() => {
    doacoesServiceMock = {
      doacoes: signal(mockDoacoes),
      direcionamentos: signal([]),
      loading: signal(false),
      fetchDoacoes: vi.fn().mockResolvedValue(mockDoacoes),
      fetchDirecionamentos: vi.fn().mockResolvedValue([]),
      deleteDoacao: vi.fn().mockResolvedValue(true),
      deleteDirecionamento: vi.fn().mockResolvedValue(true),
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

    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [DoacoesInsumosTabComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DoacoesService, useValue: doacoesServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {},
            },
          },
        },
      ],
    }).overrideComponent(DoacoesInsumosTabComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: dialogMock }],
      },
    });

    fixture = TestBed.createComponent(DoacoesInsumosTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e carregar as doações de insumos', () => {
    expect(doacoesServiceMock.fetchDoacoes).toHaveBeenCalled();
    expect(component.totalDoacoes()).toBe(1);
    expect(component.totalComSaldo()).toBe(1);
  });

  it('deve alternar a expansão de linhas na master-detail', () => {
    expect(component.isRowExpanded(1)).toBe(false);
    component.toggleExpandRow(1);
    expect(component.isRowExpanded(1)).toBe(true);
    component.toggleExpandRow(1);
    expect(component.isRowExpanded(1)).toBe(false);
  });

  it('deve abrir o modal para cadastrar ou editar doação', () => {
    component.openDoacaoDialog();
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('deve abrir o modal para direcionar insumos', () => {
    component.openDirecionarDialog(mockDoacoes[0]);
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('deve permitir exclusão de doação com confirmação', () => {
    component.confirmDeleteDoacao(mockDoacoes[0]);
    expect(dialogMock.open).toHaveBeenCalled();
    expect(doacoesServiceMock.deleteDoacao).toHaveBeenCalledWith(1);
  });
});
