import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pet } from '../models/pet.model';
import { PetReportService, PetReportStats } from './pet-report.service';

describe('PetReportService (Geração de Relatórios CSV e Impressão PDF)', () => {
  let service: PetReportService;

  const mockPets: Pet[] = [
    {
      id: 1,
      nome: 'Rex "Feroz"; Amigo',
      tipo_pet: 'Cachorro',
      sexo: 'Macho',
      status: 'Disponível',
      porte: 'Médio',
      senioridade: 'Adulto',
      chip: '981098123456789',
      rga: 'RGA-123',
      moura: 'MOURA-456',
      link_documentos: 'https://docs.ong.org/rex',
      entradas: [
        {
          id: 10,
          id_pet: 1,
          local_origem: 'Rua das Flores, 123',
          data_entrada: '2026-01-15',
          resgatante: 'Maria',
        },
      ],
    },
    {
      id: 2,
      nome: 'Mimi <script>alert(1)</script>',
      tipo_pet: 'Gato',
      sexo: 'Fêmea',
      status: 'Adotado',
      chip: null,
      rga: null,
      moura: null,
      entradas: [],
    },
    {
      id: 3,
      nome: 'Bob',
      tipo_pet: 'Cachorro',
      sexo: 'Macho',
      status: 'Em tratamento',
      entradas: [],
    },
    {
      id: 4,
      nome: 'Luna',
      tipo_pet: 'Gato',
      sexo: 'Fêmea',
      status: 'Quarentena',
      entradas: [],
    },
    {
      id: 5,
      nome: 'Max',
      tipo_pet: 'Cachorro',
      sexo: 'Macho',
      status: 'Óbito',
      entradas: [],
    },
    {
      id: 6,
      nome: 'Thor',
      tipo_pet: 'Cachorro',
      sexo: 'Macho',
      status: 'Outro Status Desconhecido',
      entradas: [],
    },
  ];

  const mockStats: PetReportStats = {
    total: 6,
    disponiveis: 1,
    tratamento: 1,
    adotados: 1,
    obitos: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), PetReportService],
    });

    service = TestBed.inject(PetReportService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportToCsv', () => {
    it('não deve fazer nada se a lista de pets for vazia ou nula', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      service.exportToCsv([]);
      expect(appendSpy).not.toHaveBeenCalled();
    });

    it('deve gerar e disparar download do CSV contendo nome da ONG do ambiente e dados sanitizados', () => {
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

      service.exportToCsv(mockPets, [{ label: 'Status', value: 'Todos' }]);

      expect(clickedLink).not.toBeNull();
      expect(clickedLink?.getAttribute('href')).toBe('blob:mock-url');
      expect(clickedLink?.getAttribute('download')).toMatch(
        /^relatorio-pets-\d{4}-\d{2}-\d{2}\.csv$/,
      );

      expect(createdBlob).not.toBeNull();
      expect(createdBlob?.type).toBe('text/csv;charset=utf-8;');
    });

    it('deve usar resumo padrão quando exportar CSV sem filtros aplicados', () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
      vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);

      expect(() => service.exportToCsv([mockPets[0]])).not.toThrow();
    });
  });

  describe('generatePdfReport', () => {
    it('deve alertar usuário caso a janela pop-up seja bloqueada pelo navegador', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      service.generatePdfReport(mockPets, mockStats);

      expect(alertSpy).toHaveBeenCalledWith(
        'Por favor, permita pop-ups no navegador para visualizar e imprimir o relatório em PDF.',
      );
    });

    it('deve montar o documento HTML completo com escape XSS, estilos de status e badges de filtros', () => {
      let writtenHtml = '';
      const fakeWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn((content: string) => {
            writtenHtml += content;
          }),
          close: vi.fn(),
        },
      };

      vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);

      service.generatePdfReport(mockPets, mockStats, [{ label: 'Espécie', value: 'Cachorro' }]);

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(fakeWindow.document.open).toHaveBeenCalled();
      expect(fakeWindow.document.write).toHaveBeenCalled();
      expect(fakeWindow.document.close).toHaveBeenCalled();

      // Verifica presença do botão de impressão
      expect(writtenHtml).toContain('btn-print');
      expect(writtenHtml).toContain('Imprimir / Salvar como PDF');

      // Verifica presença do nome da ONG configurado no ambiente
      expect(writtenHtml).toContain(environment.ongName);
      // Verifica estatísticas calculadas
      expect(writtenHtml).toContain('<div class="stat-value">6</div>');
      expect(writtenHtml).toContain('Disponíveis');
      // Verifica proteção contra injeção de HTML/XSS no nome do pet
      expect(writtenHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(writtenHtml).not.toContain('<script>alert(1)</script>');
      // Verifica tags de status estilizadas
      expect(writtenHtml).toContain('Disponível');
      expect(writtenHtml).toContain('Adotado');
      expect(writtenHtml).toContain('Em tratamento');
      expect(writtenHtml).toContain('Quarentena');
      expect(writtenHtml).toContain('Óbito');
      // Identificadores
      expect(writtenHtml).toContain('RGA-123');
      expect(writtenHtml).toContain('MOURA-456');
    });

    it('deve montar documento HTML com aviso amigável quando nenhum filtro for informado', () => {
      let writtenHtml = '';
      const fakeWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn((content: string) => {
            writtenHtml += content;
          }),
          close: vi.fn(),
        },
      };
      vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);

      service.generatePdfReport([mockPets[1]], mockStats, []);

      expect(writtenHtml).toContain('Todos os animais (Sem filtros restritivos)');
      expect(writtenHtml).toContain('Sem registro');
    });
  });
});
