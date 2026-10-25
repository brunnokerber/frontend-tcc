import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { LocaisService } from '@features/locais/services/locais.service';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Doacao, DoacaoStatus } from '../../models/doacao.model';
import { DoacaoMonetaria } from '../../models/doacao-monetaria.model';
import { DoacoesService } from '../../services/doacoes.service';
import { DoacoesMonetariasService } from '../../services/doacoes-monetarias.service';
import DoacaoListComponent from './doacao-list';

describe('DoacaoListComponent', () => {
  let fixture: ComponentFixture<DoacaoListComponent>;
  let component: DoacaoListComponent;

  let doacoesServiceMock: {
    doacoes: ReturnType<typeof signal<Doacao[]>>;
    direcionamentos: ReturnType<typeof signal<unknown[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    fetchDoacoes: ReturnType<typeof vi.fn>;
    fetchDirecionamentos: ReturnType<typeof vi.fn>;
    deleteDoacao: ReturnType<typeof vi.fn>;
    deleteDirecionamento: ReturnType<typeof vi.fn>;
  };

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
    {
      id: 2,
      tipo_doacao: 'Medicamento',
      volume: 50,
      doador: 'Mariana Lima',
      telefone: null,
      unidade_medida: 'litros',
      volume_direcionado: 50,
      volume_disponivel: 0,
      percentual_direcionado: 100,
      status: 'esgotado' as DoacaoStatus,
      created_at: '2026-10-23T10:00:00Z',
      updated_at: '2026-10-23T10:00:00Z',
    },
  ];

  const mockDoacoesMonetarias: DoacaoMonetaria[] = [
    {
      id: 1,
      valor: 200.0,
      doador: 'Lucas Silva',
      telefone: '51988887777',
      data_doacao: '2026-10-24',
      observacoes: 'Doação para compra de vacinas',
      created_at: '2026-10-24T11:00:00Z',
      updated_at: '2026-10-24T11:00:00Z',
    },
    {
      id: 2,
      valor: 500.0,
      doador: 'Empresa Parceira LTDA',
      telefone: null,
      data_doacao: '2026-10-20',
      observacoes: null,
      created_at: '2026-10-20T11:00:00Z',
      updated_at: '2026-10-20T11:00:00Z',
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

    doacoesMonetariasServiceMock = {
      doacoesMonetarias: signal(mockDoacoesMonetarias),
      loading: signal(false),
      totalArrecadado: signal(700.0),
      totalDoacoesCount: signal(2),
      mediaPorDoacao: signal(350.0),
      maiorDoacao: signal(500.0),
      fetchDoacoesMonetarias: vi.fn().mockResolvedValue(mockDoacoesMonetarias),
      deleteDoacaoMonetaria: vi.fn().mockResolvedValue(true),
    };

    locaisServiceMock = {
      fetchLocais: vi.fn().mockResolvedValue([]),
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
      imports: [DoacaoListComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DoacoesService, useValue: doacoesServiceMock },
        { provide: DoacoesMonetariasService, useValue: doacoesMonetariasServiceMock },
        { provide: LocaisService, useValue: locaisServiceMock },
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
    }).overrideComponent(DoacaoListComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: dialogMock }],
      },
    });

    fixture = TestBed.createComponent(DoacaoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inicialização e KPIs', () => {
    it('deve carregar dados de insumos, direcionamentos, locais e doações monetárias ao inicializar', () => {
      expect(doacoesServiceMock.fetchDoacoes).toHaveBeenCalled();
      expect(doacoesServiceMock.fetchDirecionamentos).toHaveBeenCalled();
      expect(locaisServiceMock.fetchLocais).toHaveBeenCalled();
      expect(doacoesMonetariasServiceMock.fetchDoacoesMonetarias).toHaveBeenCalled();
    });

    it('deve calcular corretamente os KPIs de doações de insumos', () => {
      expect(component.totalDoacoes()).toBe(2);
      expect(component.totalComSaldo()).toBe(1);
      expect(component.totalEsgotadas()).toBe(1);
      expect(component.totalDirecionamentos()).toBe(0);
    });

    it('deve calcular a paginação e total de doações monetárias', () => {
      expect(component.totalDoacoesMonetarias()).toBe(2);
      expect(component.pagedDoacoesMonetarias().length).toBe(2);
      expect(component.pagedDoacoesMonetarias()[0].doador).toBe('Lucas Silva');
    });
  });

  describe('Filtros e Paginação de Doações Monetárias', () => {
    it('deve alterar o campo de busca monetária e limpar termo anterior', () => {
      component.searchValueMonetaria.set('5199999');
      component.onSearchFieldMonetariaChange('telefone');
      expect(component.searchFieldMonetaria()).toBe('telefone');
      expect(component.searchValueMonetaria()).toBe('');
      expect(component.getSearchPlaceholderMonetaria()).toContain('telefone');
    });

    it('deve aplicar filtros de doações monetárias e resetar a página para 0', () => {
      component.searchFieldMonetaria.set('doador');
      component.searchValueMonetaria.set('Lucas');
      component.dataInicioMonetaria.set('2026-10-01');
      component.dataFimMonetaria.set('2026-10-31');
      component.pageIndexMonetaria.set(2);

      component.applyFiltersMonetaria(true);

      expect(component.pageIndexMonetaria()).toBe(0);
      expect(doacoesMonetariasServiceMock.fetchDoacoesMonetarias).toHaveBeenCalledWith({
        searchField: 'doador',
        searchValue: 'Lucas',
        dataInicio: '2026-10-01',
        dataFim: '2026-10-31',
      });
    });

    it('deve limpar os filtros de doações monetárias', () => {
      component.searchValueMonetaria.set('Termo');
      component.dataInicioMonetaria.set('2026-10-01');
      component.dataFimMonetaria.set('2026-10-31');

      component.clearFiltersMonetaria();

      expect(component.searchValueMonetaria()).toBe('');
      expect(component.dataInicioMonetaria()).toBe('');
      expect(component.dataFimMonetaria()).toBe('');
      expect(component.pageIndexMonetaria()).toBe(0);
    });

    it('deve responder à mudança de página da aba monetária', () => {
      component.onPageChangeMonetaria({ pageIndex: 1, pageSize: 25, length: 50 });
      expect(component.pageIndexMonetaria()).toBe(1);
      expect(component.pageSizeMonetaria()).toBe(25);
    });
  });

  describe('Expansão Master-Detail e Utilitários', () => {
    it('deve alternar a expansão de linhas de doações de insumos', () => {
      expect(component.isRowExpanded(1)).toBe(false);
      component.toggleExpandRow(1);
      expect(component.isRowExpanded(1)).toBe(true);
      component.toggleExpandRow(1);
      expect(component.isRowExpanded(1)).toBe(false);
    });

    it('deve formatar valores monetários corretamente', () => {
      expect(component.formatCurrency(250)).toContain('250,00');
    });

    it('deve formatar telefones e links de WhatsApp', () => {
      expect(component.formatPhone('51999991111')).toBe('(51) 99999-1111');
      expect(component.getWhatsAppLink('51999991111')).toBe('https://wa.me/5551999991111');
    });
  });

  describe('Diálogos e Exclusões', () => {
    it('deve abrir modal de doação de insumos', () => {
      component.openDoacaoDialog();
      expect(dialogMock.open).toHaveBeenCalled();
    });

    it('deve abrir modal de direcionamento de insumos', () => {
      component.openDirecionarDialog(mockDoacoes[0]);
      expect(dialogMock.open).toHaveBeenCalled();
    });

    it('deve abrir modal de doação monetária', () => {
      component.openDoacaoMonetariaDialog();
      expect(dialogMock.open).toHaveBeenCalled();
    });

    it('deve permitir exclusão de doação monetária quando usuário for administrador', () => {
      authServiceMock.isAdmin.set(true);

      component.confirmDeleteDoacaoMonetaria(mockDoacoesMonetarias[0]);

      expect(dialogMock.open).toHaveBeenCalled();
      expect(doacoesMonetariasServiceMock.deleteDoacaoMonetaria).toHaveBeenCalledWith(1);
    });

    it('deve bloquear exclusão de doação monetária e exibir aviso quando usuário não for administrador', () => {
      authServiceMock.isAdmin.set(false);

      component.confirmDeleteDoacaoMonetaria(mockDoacoesMonetarias[0]);

      expect(toastMock.error).toHaveBeenCalledWith(
        'Apenas administradores possuem permissão para excluir doações monetárias.',
      );
      expect(doacoesMonetariasServiceMock.deleteDoacaoMonetaria).not.toHaveBeenCalled();
    });

    it('deve permitir exclusão de direcionamento quando usuário for administrador', () => {
      authServiceMock.isAdmin.set(true);
      const mockDirec = {
        id: 10,
        id_doacao: 1,
        id_local: 2,
        volume: 20,
        created_at: '',
        updated_at: '',
      };

      component.confirmDeleteDirecionamento(mockDirec, 'kg');

      expect(dialogMock.open).toHaveBeenCalled();
      expect(doacoesServiceMock.deleteDirecionamento).toHaveBeenCalledWith(10);
    });

    it('deve bloquear exclusão de direcionamento quando usuário não for administrador', () => {
      authServiceMock.isAdmin.set(false);
      const mockDirec = {
        id: 10,
        id_doacao: 1,
        id_local: 2,
        volume: 20,
        created_at: '',
        updated_at: '',
      };

      component.confirmDeleteDirecionamento(mockDirec, 'kg');

      expect(toastMock.error).toHaveBeenCalledWith(
        'Apenas administradores possuem permissão para excluir direcionamentos de doações.',
      );
      expect(doacoesServiceMock.deleteDirecionamento).not.toHaveBeenCalled();
    });
  });
});
