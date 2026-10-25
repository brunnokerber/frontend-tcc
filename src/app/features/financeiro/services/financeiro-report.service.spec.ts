import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BalancoFinanceiro, MovimentacaoFluxoCaixa } from '../models/fluxo-caixa.model';
import { FinanceiroReportService } from './financeiro-report.service';

describe('FinanceiroReportService (Exportação de Balanço e Relatórios)', () => {
  let service: FinanceiroReportService;

  const mockBalanco: BalancoFinanceiro = {
    totalEntradas: 1500.0,
    totalSaidas: 1000.0,
    saldoLiquido: 500.0,
    taxaCobertura: 150.0,
    qtdEntradas: 2,
    qtdSaidas: 3,
    ticketMedioEntrada: 750.0,
    ticketMedioSaida: 333.33,
  };

  const mockMovimentacoes: MovimentacaoFluxoCaixa[] = [
    {
      tipo_movimentacao: 'Entrada',
      categoria: 'Doação Monetária',
      valor: 1500.0,
      data_movimentacao: '2026-10-15',
      pessoa_referencia: 'Doador Anônimo',
      observacoes: 'Campanha de resgate',
      id_pet: null,
      created_at: '2026-10-15T10:00:00Z',
    },
    {
      tipo_movimentacao: 'Saída',
      categoria: 'Alimentação / Ração',
      valor: 1000.0,
      data_movimentacao: '2026-10-18',
      pessoa_referencia: 'Fornecedor Ração',
      observacoes: '20 sacos',
      id_pet: null,
      created_at: '2026-10-18T14:00:00Z',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), FinanceiroReportService],
    });
    service = TestBed.inject(FinanceiroReportService);
  });

  describe('exportToCsv', () => {
    it('deve exportar para CSV disparando o download sem erros', () => {
      let createdBlob: Blob | null = null;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
        createdBlob = blob;
        return 'blob:mock-url';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      let clickedLink: HTMLAnchorElement | null = null;
      vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
        if (node instanceof HTMLAnchorElement) {
          clickedLink = node;
        }
        return node;
      });
      vi.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);

      service.exportToCsv(mockMovimentacoes, mockBalanco, 'Outubro/2026');

      expect(createdBlob).not.toBeNull();
      expect(clickedLink).not.toBeNull();
      expect(clickedLink!.getAttribute('download')).toContain('balanco_financeiro');
    });

    it('não deve disparar download se lista estiver vazia', () => {
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      service.exportToCsv([], mockBalanco, 'Outubro/2026');
      expect(appendChildSpy).not.toHaveBeenCalled();
    });
  });

  describe('printBalancetePdf', () => {
    it('deve abrir janela e injetar HTML de impressão', () => {
      const mockPrintWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
      };

      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);

      service.printBalancetePdf(mockMovimentacoes, mockBalanco, [], 'Outubro/2026');

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.open).toHaveBeenCalled();
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.document.close).toHaveBeenCalled();
    });
  });
});
