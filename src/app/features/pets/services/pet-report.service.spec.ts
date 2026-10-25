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

  describe('generatePetFichaPdf', () => {
    it('não deve fazer nada se data.pet for nulo ou indefinido', () => {
      vi.spyOn(window, 'open');
      service.generatePetFichaPdf({ pet: null as unknown as Pet });
      expect(window.open).not.toHaveBeenCalled();
    });

    it('deve alertar o usuário caso a janela popup seja bloqueada pelo navegador', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      service.generatePetFichaPdf({ pet: mockPets[0] });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('permita pop-ups no navegador'),
      );
    });

    it('deve gerar ficha de adoção e prontuário sem custos (modo adotante com termo de guarda)', () => {
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

      service.generatePetFichaPdf({
        pet: mockPets[0],
        fotoUrl: 'https://storage/rex.jpg',
        vacinas: [
          {
            id: 1,
            id_pet: 1,
            nome_vacina: 'V10 Déctupla',
            data_prevista: '2026-02-01',
            data_aplicacao: '2026-02-01',
            veterinario: { id: 1, nome: 'Dr. Carlos Silva' },
            custo: 90,
          },
        ],
        consultas: [
          {
            id: 1,
            id_pet: 1,
            tipo_operacao: 'Consulta de Rotina',
            operacao_medicamento: 'Checkup Geral',
            data_realizacao: '2026-02-10',
            veterinario: { id: 1, nome: 'Dr. Carlos Silva' },
            custo: 120,
          },
        ],
        incluirFinanceiro: false,
      });

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(writtenHtml).toContain('Ficha de Adoção &amp; Prontuário do Animal');
      expect(writtenHtml).toContain('Rex &quot;Feroz&quot;; Amigo');
      expect(writtenHtml).toContain('Termo de Guarda Responsável e Entrega do Animal');
      expect(writtenHtml).toContain('Assinatura do Adotante / Tutor Responsável');
      expect(writtenHtml).toContain('V10 Déctupla');
      expect(writtenHtml).toContain('Dr. Carlos Silva');
      expect(writtenHtml).toContain('Checkup Geral');
      // No modo adotante, não deve exibir resumo financeiro
      expect(writtenHtml).not.toContain('Resumo Financeiro &amp; Investimentos');
    });

    it('deve gerar ficha completa com prestação de contas quando incluirFinanceiro for true', () => {
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

      service.generatePetFichaPdf({
        pet: mockPets[0],
        incluirFinanceiro: true,
        totalInvestido: 450,
        totalCustoVacinas: 100,
        totalCustoConsultas: 150,
        totalCustoAuxilio: 100,
        totalCustoDespesas: 100,
        despesas: [
          {
            id: 1,
            id_pet: 1,
            categoria: 'Medicamentos',
            descricao: 'Antibiótico Pós-operatório',
            valor: 100,
            data_despesa: '2026-02-15',
          },
        ],
      });

      expect(writtenHtml).toContain('Ficha do Animal &amp; Prestação de Contas');
      expect(writtenHtml).toContain('Resumo Financeiro & Investimentos no Animal');
      expect(writtenHtml).toContain('Antibiótico Pós-operatório');
      expect(writtenHtml).not.toContain('Termo de Guarda Responsável e Entrega');
    });
  });

  describe('exportPetSingleCsv', () => {
    it('não deve fazer nada se data.pet for nulo ou indefinido', () => {
      const createElSpy = vi.spyOn(document, 'createElement');
      service.exportPetSingleCsv({ pet: null as unknown as Pet });
      expect(createElSpy).not.toHaveBeenCalled();
    });

    it('deve exportar CSV da ficha individual do pet com suas seções', () => {
      let blobResult: Blob | null = null;
      let downloadedFilename = '';

      vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
        blobResult = blob;
        return 'blob:mock-csv-url';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const mockAnchor = {
        setAttribute: vi.fn((attr: string, val: string) => {
          if (attr === 'download') downloadedFilename = val;
        }),
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockAnchor as unknown as HTMLAnchorElement,
      );
      vi.spyOn(document.body, 'appendChild').mockImplementation(
        () => mockAnchor as unknown as Node,
      );
      vi.spyOn(document.body, 'removeChild').mockImplementation(
        () => mockAnchor as unknown as Node,
      );

      service.exportPetSingleCsv({
        pet: mockPets[0],
        vacinas: [
          {
            id: 1,
            id_pet: 1,
            nome_vacina: 'Antirrábica',
            data_prevista: '2026-01-20',
            data_aplicacao: '2026-01-20',
            custo: 50,
          },
        ],
        consultas: [
          {
            id: 1,
            id_pet: 1,
            tipo_operacao: 'Exame de Sangue',
            operacao_medicamento: 'Hemograma',
            data_realizacao: '2026-01-22',
            custo: 80,
          },
        ],
        incluirFinanceiro: true,
        totalInvestido: 130,
      });

      expect(mockAnchor.click).toHaveBeenCalled();
      expect(downloadedFilename).toContain('ficha-pet-1-');
      expect(blobResult).toBeTruthy();
    });
  });
});
