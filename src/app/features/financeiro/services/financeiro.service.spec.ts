import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MovimentacaoFluxoCaixa } from '../models/fluxo-caixa.model';
import { FinanceiroService } from './financeiro.service';

describe('FinanceiroService (Consolidação do Fluxo de Caixa e Balanço)', () => {
  let service: FinanceiroService;
  let supabaseMock: any;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockMovimentacoes: MovimentacaoFluxoCaixa[] = [
    {
      tipo_movimentacao: 'Entrada',
      categoria: 'Doação Monetária',
      valor: 1000.0,
      data_movimentacao: '2026-10-05',
      pessoa_referencia: 'Maria Silva',
      observacoes: 'Doação via PIX',
      id_pet: null,
      created_at: '2026-10-05T10:00:00Z',
    },
    {
      tipo_movimentacao: 'Entrada',
      categoria: 'Doação Monetária',
      valor: 500.0,
      data_movimentacao: '2026-10-12',
      pessoa_referencia: 'Carlos Souza',
      observacoes: null,
      id_pet: null,
      created_at: '2026-10-12T14:00:00Z',
    },
    {
      tipo_movimentacao: 'Saída',
      categoria: 'Alimentação / Ração',
      valor: 600.0,
      data_movimentacao: '2026-10-10',
      pessoa_referencia: 'Agropecuária Vale',
      observacoes: 'Compra de ração',
      id_pet: null,
      created_at: '2026-10-10T09:00:00Z',
    },
    {
      tipo_movimentacao: 'Saída',
      categoria: 'Procedimento Cirúrgico',
      valor: 400.0,
      data_movimentacao: '2026-10-18',
      pessoa_referencia: 'Clínica Veterinária Vida',
      observacoes: 'Castração de emergência',
      id_pet: 1,
      created_at: '2026-10-18T16:00:00Z',
    },
    {
      tipo_movimentacao: 'Saída',
      categoria: 'Vacinação Preventiva',
      valor: 100.0,
      data_movimentacao: '2026-10-20',
      pessoa_referencia: 'Vacina V10',
      observacoes: 'Dose anual',
      id_pet: 1,
      created_at: '2026-10-20T11:00:00Z',
    },
    {
      tipo_movimentacao: 'Saída',
      categoria: 'Medicamento',
      valor: 200.0,
      data_movimentacao: '2026-09-28',
      pessoa_referencia: 'Farmácia Vet',
      observacoes: 'Antibiótico',
      id_pet: 2,
      created_at: '2026-09-28T10:00:00Z',
    },
    {
      tipo_movimentacao: 'Saída',
      categoria: 'Auxílio Lar Temporário',
      valor: 300.0,
      data_movimentacao: '2026-10-15',
      pessoa_referencia: 'Lar da Dona Ana',
      observacoes: 'Auxílio estadia pós-operatório',
      id_pet: 1,
      created_at: '2026-10-15T15:00:00Z',
    },
  ];

  beforeEach(() => {
    supabaseMock = {
      client: {
        from: vi.fn(),
      },
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        FinanceiroService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(FinanceiroService);
  });

  describe('Cálculos do Balanço (KPIs)', () => {
    it('deve calcular corretamente totalEntradas, totalSaidas, saldoLiquido e taxaCobertura', () => {
      service.movimentacoes.set(mockMovimentacoes);

      const bal = service.balanco();

      // Entradas: 1000 + 500 = 1500
      expect(bal.totalEntradas).toBe(1500.0);
      expect(bal.qtdEntradas).toBe(2);
      expect(bal.ticketMedioEntrada).toBe(750.0);

      // Saídas: 600 + 400 + 100 + 200 + 300 = 1600
      expect(bal.totalSaidas).toBe(1600.0);
      expect(bal.qtdSaidas).toBe(5);
      expect(bal.ticketMedioSaida).toBe(320.0);

      // Saldo: 1500 - 1600 = -100
      expect(bal.saldoLiquido).toBe(-100.0);

      // Taxa de Cobertura: (1500 / 1600) * 100 = 93.75%
      expect(bal.taxaCobertura).toBeCloseTo(93.75, 1);
    });

    it('deve lidar com lista vazia sem quebrar ou gerar divisão por zero', () => {
      service.movimentacoes.set([]);

      const bal = service.balanco();

      expect(bal.totalEntradas).toBe(0);
      expect(bal.totalSaidas).toBe(0);
      expect(bal.saldoLiquido).toBe(0);
      expect(bal.taxaCobertura).toBe(0);
      expect(bal.ticketMedioEntrada).toBe(0);
      expect(bal.ticketMedioSaida).toBe(0);
    });
  });

  describe('Cálculos por Categoria e Evolução Mensal', () => {
    it('deve agrupar despesas por categoria com percentual decrescente', () => {
      service.movimentacoes.set(mockMovimentacoes);

      const cats = service.despesasPorCategoria();

      // Total Saídas = 1600 (5 categorias)
      expect(cats.length).toBe(5);
      expect(cats[0].categoria).toBe('Alimentação / Ração');
      expect(cats[0].total).toBe(600.0);
      expect(cats[0].percentual).toBeCloseTo((600 / 1600) * 100, 1);

      expect(cats[1].categoria).toBe('Procedimento Cirúrgico');
      expect(cats[1].total).toBe(400.0);

      expect(cats[2].categoria).toBe('Auxílio Lar Temporário');
      expect(cats[2].total).toBe(300.0);
      expect(cats[2].percentual).toBeCloseTo((300 / 1600) * 100, 1);
    });

    it('deve agrupar evolução mensal cronológica', () => {
      service.movimentacoes.set(mockMovimentacoes);

      const meses = service.evolucaoMensal();

      // 2026-09 e 2026-10
      expect(meses.length).toBe(2);
      expect(meses[0].chave).toBe('2026-09');
      expect(meses[0].entradas).toBe(0);
      expect(meses[0].saidas).toBe(200.0);
      expect(meses[0].saldo).toBe(-200.0);

      expect(meses[1].chave).toBe('2026-10');
      expect(meses[1].entradas).toBe(1500.0);
      expect(meses[1].saidas).toBe(1400.0);
      expect(meses[1].saldo).toBe(100.0);
    });

    it('deve calcular top animais com maior custo vinculados a despesas', () => {
      service.movimentacoes.set(mockMovimentacoes);
      service.petsMap.set(
        new Map([
          [1, 'Rex'],
          [2, 'Mimi'],
        ]),
      );

      const topPets = service.topPetsCusto();

      // Pet 1: 400 (Cirurgia) + 100 (Vacina) + 300 (Auxílio Lar) = 800 (3 procedimentos)
      // Pet 2: 200 (1 procedimento)
      expect(topPets.length).toBe(2);
      expect(topPets[0].id_pet).toBe(1);
      expect(topPets[0].nome_pet).toBe('Rex');
      expect(topPets[0].totalGasto).toBe(800.0);
      expect(topPets[0].quantidadeProcedimentos).toBe(3);

      expect(topPets[1].id_pet).toBe(2);
      expect(topPets[1].nome_pet).toBe('Mimi');
      expect(topPets[1].totalGasto).toBe(200.0);
    });
  });

  describe('carregarFluxoCaixa', () => {
    it('deve consultar a view vw_fluxo_caixa com filtro de data', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMovimentacoes, error: null }),
      };

      const petsQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 1, nome: 'Rex' },
            { id: 2, nome: 'Mimi' },
          ],
          error: null,
        }),
      };

      supabaseMock.client.from.mockImplementation((table: string) => {
        if (table === 'vw_fluxo_caixa') return queryBuilder;
        if (table === 'pets') return petsQueryBuilder;
        return queryBuilder;
      });

      await service.carregarFluxoCaixa();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('vw_fluxo_caixa');
      expect(queryBuilder.select).toHaveBeenCalledWith('*');
      expect(service.movimentacoes()).toEqual(mockMovimentacoes);
      expect(service.petsMap().get(1)).toBe('Rex');
      expect(service.petsMap().get(2)).toBe('Mimi');
      expect(service.loading()).toBe(false);
    });
  });

  describe('calcularIntervaloPeriodo', () => {
    it('deve computar início e fim do mês atual', () => {
      const f = service.calcularIntervaloPeriodo('mes_atual');
      expect(f.tipo).toBe('mes_atual');
      expect(f.dataInicio).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('deve computar ano vigente', () => {
      const anoAtual = new Date().getFullYear();
      const f = service.calcularIntervaloPeriodo('ano');
      expect(f.tipo).toBe('ano');
      expect(f.dataInicio).toBe(`${anoAtual}-01-01`);
      expect(f.dataFim).toBe(`${anoAtual}-12-31`);
    });
  });
});
