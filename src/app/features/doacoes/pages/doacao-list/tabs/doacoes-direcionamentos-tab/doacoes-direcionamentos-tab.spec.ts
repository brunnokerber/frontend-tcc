import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { LocaisService } from '@features/locais/services/locais.service';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DirecionamentoDoacao } from '@features/doacoes/models/doacao.model';
import { DoacoesService } from '@features/doacoes/services/doacoes.service';
import { DoacoesDirecionamentosTabComponent } from './doacoes-direcionamentos-tab';

describe('DoacoesDirecionamentosTabComponent', () => {
  let fixture: ComponentFixture<DoacoesDirecionamentosTabComponent>;
  let component: DoacoesDirecionamentosTabComponent;

  let doacoesServiceMock: {
    direcionamentos: ReturnType<typeof signal<DirecionamentoDoacao[]>>;
    fetchDirecionamentos: ReturnType<typeof vi.fn>;
    deleteDirecionamento: ReturnType<typeof vi.fn>;
  };

  let locaisServiceMock: {
    fetchLocais: ReturnType<typeof vi.fn>;
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

  const mockDirecionamento: DirecionamentoDoacao = {
    id: 1,
    id_doacao: 1,
    id_local: 10,
    volume: 30,
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
    local: {
      id: 10,
      local: 'Lar Esperança',
      tipo_local: 'Lar Temporário',
      capacidade: 15,
      ocupacao: 5,
      taxa_ocupacao: 33.3,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  };

  beforeEach(() => {
    doacoesServiceMock = {
      direcionamentos: signal([mockDirecionamento]),
      fetchDirecionamentos: vi.fn().mockResolvedValue([mockDirecionamento]),
      deleteDirecionamento: vi.fn().mockResolvedValue(true),
    };

    locaisServiceMock = {
      fetchLocais: vi.fn().mockResolvedValue([mockDirecionamento.local]),
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
      imports: [DoacoesDirecionamentosTabComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DoacoesService, useValue: doacoesServiceMock },
        { provide: LocaisService, useValue: locaisServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    }).overrideComponent(DoacoesDirecionamentosTabComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: dialogMock }],
      },
    });

    fixture = TestBed.createComponent(DoacoesDirecionamentosTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar e carregar os direcionamentos e locais', () => {
    expect(doacoesServiceMock.fetchDirecionamentos).toHaveBeenCalled();
    expect(locaisServiceMock.fetchLocais).toHaveBeenCalled();
    expect(component.totalDirecionamentos()).toBe(1);
    expect(component.pagedDirecionamentos().length).toBe(1);
  });

  it('deve filtrar direcionamentos por local selecionado', () => {
    component.localFilterConsolidado.set(10);
    expect(component.filteredDirecionamentos().length).toBe(1);

    component.localFilterConsolidado.set(999);
    expect(component.filteredDirecionamentos().length).toBe(0);
  });

  it('deve excluir direcionamento com confirmação se usuário for admin', () => {
    component.confirmDeleteDirecionamento(mockDirecionamento, 'kg');
    expect(dialogMock.open).toHaveBeenCalled();
    expect(doacoesServiceMock.deleteDirecionamento).toHaveBeenCalledWith(1);
  });
});
