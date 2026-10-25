import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Despesa } from '@features/financeiro/models/despesa.model';
import { ConsultaExame } from '../models/consulta-exame.model';
import { PetLocal } from '../models/pet-local.model';
import { Pet } from '../models/pet.model';
import { Vacina } from '../models/vacina.model';

export interface PetReportStats {
  total: number;
  disponiveis: number;
  tratamento: number;
  adotados: number;
  obitos: number;
}

export interface PetReportFilterItem {
  label: string;
  value: string;
}

export interface PetFichaReportData {
  pet: Pet;
  fotoUrl?: string | null;
  vacinas?: Vacina[];
  consultas?: ConsultaExame[];
  locais?: PetLocal[];
  despesas?: Despesa[];
  incluirFinanceiro?: boolean;
  totalInvestido?: number;
  totalCustoVacinas?: number;
  totalCustoConsultas?: number;
  totalCustoAuxilio?: number;
  totalCustoDespesas?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PetReportService {
  private readonly ongName = environment.ongName;

  /**
   * Exporta a lista de pets filtrados para planilha Excel (.csv com UTF-8 BOM)
   */
  exportToCsv(pets: Pet[], appliedFilters: PetReportFilterItem[] = []): void {
    if (!pets || pets.length === 0) {
      return;
    }

    const headers = [
      'ID',
      'Nome',
      'Espécie',
      'Sexo',
      'Status',
      'Raça',
      'Porte',
      'Fase da Vida',
      'Cor Majoritária',
      'Data Nascimento',
      'Data Castração',
      'Local de Origem',
      'Data de Entrada',
      'Resgatante',
      'Microchip',
      'RGA',
      'Código Moura',
      'Link Documentos',
    ];

    const rows = pets.map((pet) => {
      const entrada = pet.entradas && pet.entradas.length > 0 ? pet.entradas[0] : null;

      return [
        pet.id,
        this.escapeCsv(pet.nome),
        this.escapeCsv(pet.tipo_pet),
        this.escapeCsv(pet.sexo),
        this.escapeCsv(pet.status),
        this.escapeCsv(pet.raca || 'SRD'),
        this.escapeCsv(pet.porte || 'Não informado'),
        this.escapeCsv(pet.senioridade || 'Não informada'),
        this.escapeCsv(pet.cor_majoritaria || 'Não informada'),
        this.formatDate(pet.data_nascimento),
        this.formatDate(pet.data_castracao),
        this.escapeCsv(entrada?.local_origem || 'Não informada'),
        this.formatDate(entrada?.data_entrada),
        this.escapeCsv(entrada?.resgatante || 'Não informado'),
        this.escapeCsv(pet.chip ? `'${pet.chip}` : ''), // Aspa simples no início para evitar formatação de notação científica no Excel
        this.escapeCsv(pet.rga || ''),
        this.escapeCsv(pet.moura || ''),
        this.escapeCsv(pet.link_documentos || ''),
      ];
    });

    // Metadados no topo do CSV
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    const filterSummary =
      appliedFilters.length > 0
        ? appliedFilters.map((f) => `${f.label}: ${f.value}`).join(' | ')
        : 'Nenhum filtro aplicado (Todos os registros)';

    const metadataRows = [
      [`${this.ongName} - Relatório de Pets`],
      [`Gerado em:;${formattedDate}`],
      [`Filtros aplicados:;${this.escapeCsv(filterSummary)}`],
      [`Total de registros:;${pets.length}`],
      [''], // Linha em branco separadora
    ];

    const csvContent =
      '\uFEFF' + // UTF-8 BOM para garantir acentos corretos no Excel
      metadataRows.map((r) => r.join(';')).join('\r\n') +
      '\r\n' +
      headers.join(';') +
      '\r\n' +
      rows.map((r) => r.join(';')).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileDate = now.toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-pets-${fileDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre a janela de visualização e impressão profissional do relatório para gerar PDF
   */
  generatePdfReport(
    pets: Pet[],
    stats: PetReportStats,
    appliedFilters: PetReportFilterItem[] = [],
  ): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(
        'Por favor, permita pop-ups no navegador para visualizar e imprimir o relatório em PDF.',
      );
      return;
    }

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');

    const filterBadgesHtml =
      appliedFilters.length > 0
        ? appliedFilters
            .map(
              (f) =>
                `<span style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:3px 8px;margin:2px 4px 2px 0;font-size:12px;color:#334155;"><strong>${this.escapeHtml(f.label)}:</strong> ${this.escapeHtml(f.value)}</span>`,
            )
            .join(' ')
        : '<span style="color:#64748b;font-size:13px;font-style:italic;">Todos os animais (Sem filtros restritivos)</span>';

    const rowsHtml = pets
      .map((pet, idx) => {
        const entrada = pet.entradas && pet.entradas.length > 0 ? pet.entradas[0] : null;
        const statusClass = this.getStatusStyle(pet.status);

        return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #fafbfc;' : ''}">
          <td style="padding: 8px 10px; font-weight: 600; color: #1e293b; font-size: 12px;">#${pet.id}</td>
          <td style="padding: 8px 10px; font-size: 13px; font-weight: bold; color: #0f172a;">${this.escapeHtml(pet.nome)}</td>
          <td style="padding: 8px 10px; font-size: 12px; color: #334155;">${this.escapeHtml(pet.tipo_pet)} (${this.escapeHtml(pet.sexo)})</td>
          <td style="padding: 8px 10px; font-size: 12px; color: #334155;">${this.escapeHtml(pet.porte || '-')} / ${this.escapeHtml(pet.senioridade || '-')}</td>
          <td style="padding: 8px 10px; font-size: 11px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 600; ${statusClass}">
              ${this.escapeHtml(pet.status)}
            </span>
          </td>
          <td style="padding: 8px 10px; font-size: 11px; color: #475569;">
            ${entrada ? `<div><strong>${this.escapeHtml(entrada.local_origem)}</strong></div><div style="color:#64748b;font-size:10px;">Entrada: ${this.formatDate(entrada.data_entrada)}</div>` : '<span style="color:#94a3b8;font-style:italic;">Sem registro</span>'}
          </td>
          <td style="padding: 8px 10px; font-size: 11px; color: #334155;">
            ${pet.chip ? `<div><span style="color:#64748b;">Chip:</span> ${this.escapeHtml(pet.chip)}</div>` : ''}
            ${pet.rga ? `<div><span style="color:#64748b;">RGA:</span> ${this.escapeHtml(pet.rga)}</div>` : ''}
            ${pet.moura ? `<div><span style="color:#64748b;">Moura:</span> ${this.escapeHtml(pet.moura)}</div>` : ''}
            ${!pet.chip && !pet.rga && !pet.moura ? '<span style="color:#94a3b8;">-</span>' : ''}
          </td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatório de Pets - ${this.escapeHtml(this.ongName)}</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background-color: #fff; }
          
          .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
          .org-title { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px 0; }
          .report-subtitle { font-size: 14px; color: #64748b; margin: 0; }
          .meta-info { text-align: right; font-size: 12px; color: #64748b; }

          .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
          .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
          .stat-value { font-size: 18px; font-weight: 800; color: #0f172a; }

          .filters-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 20px; }
          .filters-title { font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; }

          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
          
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
          
          .no-print { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 16px; }
          .btn-print { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); transition: background-color 0.15s ease; }
          .btn-print:hover { background: #1d4ed8; }

          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            @page { margin: 12mm 15mm; size: A4 portrait; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
        </div>

        <div class="report-header">
          <div>
            <h1 class="org-title">🐾 ${this.escapeHtml(this.ongName)}</h1>
            <p class="report-subtitle">Sistema de Gerenciamento de Animais Resgatados &bull; Relatório de Animais</p>
          </div>
          <div class="meta-info">
            <div><strong>Emissão:</strong> ${formattedDate}</div>
            <div><strong>Registros listados:</strong> ${pets.length}</div>
          </div>
        </div>

        <!-- Indicadores Rápidos -->
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">Total Filtrado</div>
            <div class="stat-value">${stats.total}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label" style="color:#16a34a;">Disponíveis</div>
            <div class="stat-value" style="color:#16a34a;">${stats.disponiveis}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label" style="color:#d97706;">Tratamento</div>
            <div class="stat-value" style="color:#d97706;">${stats.tratamento}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label" style="color:#2563eb;">Adotados</div>
            <div class="stat-value" style="color:#2563eb;">${stats.adotados}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label" style="color:#dc2626;">Óbitos</div>
            <div class="stat-value" style="color:#dc2626;">${stats.obitos}</div>
          </div>
        </div>

        <!-- Filtros Aplicados -->
        <div class="filters-card">
          <div class="filters-title">Filtros Ativos nesta Consulta:</div>
          <div>${filterBadgesHtml}</div>
        </div>

        <!-- Tabela -->
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">ID</th>
              <th>Nome</th>
              <th>Espécie / Sexo</th>
              <th>Porte / Fase</th>
              <th>Status</th>
              <th>Origem / Entrada</th>
              <th>Identificação</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>${this.escapeHtml(this.ongName)} &bull; Documento gerado eletronicamente para fins de controle e auditoria interna.</span>
          <span>Página 1</span>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Abre janela de impressão/PDF da Ficha Individual do Pet (para adotantes ou cópia física)
   */
  generatePetFichaPdf(data: PetFichaReportData): void {
    if (!data.pet) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(
        'Por favor, permita pop-ups no navegador para visualizar e imprimir a ficha do animal em PDF.',
      );
      return;
    }

    const {
      pet,
      fotoUrl,
      vacinas = [],
      consultas = [],
      locais = [],
      despesas = [],
      incluirFinanceiro = false,
      totalInvestido = 0,
      totalCustoVacinas = 0,
      totalCustoConsultas = 0,
      totalCustoAuxilio = 0,
      totalCustoDespesas = 0,
    } = data;

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');
    const entrada = pet.entradas && pet.entradas.length > 0 ? pet.entradas[0] : null;

    const tituloDocumento = incluirFinanceiro
      ? 'Ficha do Animal & Prestação de Contas'
      : 'Ficha de Adoção & Prontuário do Animal';

    const subtituloDocumento = incluirFinanceiro
      ? 'Documento Interno para Auditoria, Custos e Controle Administrativo'
      : 'Documento Oficial para Adoção Responsável, Acompanhamento Veterinário e Cópia Física';

    // Linhas de vacinas
    const vacinasHtml =
      vacinas.length > 0
        ? vacinas
            .map((v, idx) => {
              const statusVacina = v.data_aplicacao
                ? `<span style="background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">Aplicada</span>`
                : `<span style="background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">Prevista</span>`;
              const vetNome = v.veterinario?.nome || 'Não informado';
              const custoTd = incluirFinanceiro
                ? `<td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #334155;">${this.formatCurrency(v.custo)}</td>`
                : '';

              return `
              <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 6px 8px; font-size: 12px; font-weight: 600; color: #0f172a;">${this.escapeHtml(v.nome_vacina)}</td>
                <td style="padding: 6px 8px; font-size: 11px; color: #334155;">${this.formatDate(v.data_prevista)}</td>
                <td style="padding: 6px 8px; font-size: 11px; color: #334155;">${this.formatDate(v.data_aplicacao)}</td>
                <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${this.escapeHtml(vetNome)}</td>
                <td style="padding: 6px 8px; text-align: center;">${statusVacina}</td>
                ${custoTd}
              </tr>
            `;
            })
            .join('')
        : `<tr><td colspan="${incluirFinanceiro ? 6 : 5}" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">Nenhum registro de vacina cadastrado.</td></tr>`;

    // Linhas de consultas/procedimentos
    const consultasHtml =
      consultas.length > 0
        ? consultas
            .map((c, idx) => {
              const vetNome = c.veterinario?.nome || 'Não informado';
              const custoTd = incluirFinanceiro
                ? `<td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #334155;">${this.formatCurrency(c.custo)}</td>`
                : '';

              return `
              <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 6px 8px; font-size: 11px; color: #334155;">${this.formatDate(c.data_realizacao)}</td>
                <td style="padding: 6px 8px; font-size: 11px; font-weight: 600; color: #1e3a8a;">${this.escapeHtml(c.tipo_operacao)}</td>
                <td style="padding: 6px 8px; font-size: 12px; color: #0f172a;">${this.escapeHtml(c.operacao_medicamento)}</td>
                <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${this.escapeHtml(vetNome)}</td>
                ${custoTd}
              </tr>
            `;
            })
            .join('')
        : `<tr><td colspan="${incluirFinanceiro ? 5 : 4}" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">Nenhum procedimento ou consulta clínica registrado.</td></tr>`;

    // Linhas de passagens por locais
    const locaisHtml =
      locais.length > 0
        ? locais
            .map((l, idx) => {
              const localNome = l.local?.local || l.locais?.local || `Local #${l.id_local}`;
              const auxilioTd = incluirFinanceiro
                ? `<td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #334155;">${this.formatCurrency(l.valor_auxilio)}</td>`
                : '';

              return `
              <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 6px 8px; font-size: 12px; font-weight: 600; color: #0f172a;">${this.escapeHtml(localNome)}</td>
                <td style="padding: 6px 8px; font-size: 11px; color: #334155;">${this.formatDate(l.data_saida)}</td>
                <td style="padding: 6px 8px; font-size: 11px; color: #334155;">${this.formatDate(l.data_reentrada)}</td>
                <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${this.escapeHtml(l.motivo_saida || l.obs || l.observacoes || '-')}</td>
                ${auxilioTd}
              </tr>
            `;
            })
            .join('')
        : '';

    // Seção financeira (se solicitada)
    const secaoFinanceiraHtml = incluirFinanceiro
      ? `
      <div style="margin-top: 24px; page-break-inside: avoid;">
        <h3 style="font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 12px;">
          💰 Resumo Financeiro & Investimentos no Animal
        </h3>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: #1e40af; text-transform: uppercase; font-weight: 700;">Total Investido</div>
            <div style="font-size: 16px; font-weight: 800; color: #1e3a8a;">${this.formatCurrency(totalInvestido)}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: #15803d; text-transform: uppercase; font-weight: 700;">Vacinas</div>
            <div style="font-size: 15px; font-weight: 800; color: #166534;">${this.formatCurrency(totalCustoVacinas)}</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: #b45309; text-transform: uppercase; font-weight: 700;">Procedimentos</div>
            <div style="font-size: 15px; font-weight: 800; color: #92400e;">${this.formatCurrency(totalCustoConsultas)}</div>
          </div>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: #0369a1; text-transform: uppercase; font-weight: 700;">Aux. Moradia</div>
            <div style="font-size: 15px; font-weight: 800; color: #075985;">${this.formatCurrency(totalCustoAuxilio)}</div>
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: #b91c1c; text-transform: uppercase; font-weight: 700;">Despesas ONG</div>
            <div style="font-size: 15px; font-weight: 800; color: #991b1b;">${this.formatCurrency(totalCustoDespesas)}</div>
          </div>
        </div>
        ${
          despesas.length > 0
            ? `
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Data</th>
                <th style="padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Categoria</th>
                <th style="padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Descrição da Despesa</th>
                <th style="padding: 6px 8px; text-align: right; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${despesas
                .map(
                  (d, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                  <td style="padding: 6px 8px; font-size: 11px; color: #334155;">${this.formatDate(d.data_despesa)}</td>
                  <td style="padding: 6px 8px; font-size: 11px; font-weight: 600; color: #0f172a;">${this.escapeHtml(d.categoria)}</td>
                  <td style="padding: 6px 8px; font-size: 11px; color: #334155;">${this.escapeHtml(d.descricao)}</td>
                  <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: 600; color: #b91c1c;">${this.formatCurrency(d.valor)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }
      </div>
    `
      : '';

    // Termo de Adoção / Assinatura (se for para adotante / cópia física sem financeiro)
    const termoAdoceaoHtml = !incluirFinanceiro
      ? `
      <div style="margin-top: 24px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px 16px; background-color: #f8fafc; page-break-inside: avoid;">
        <h4 style="font-size: 12px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; margin: 0 0 6px 0;">
          📜 Termo de Guarda Responsável e Entrega do Animal
        </h4>
        <p style="font-size: 11px; color: #334155; line-height: 1.5; margin: 0 0 16px 0; text-align: justify;">
          Declaro ter recebido o animal acima identificado em boas condições de manejo e saúde, acompanhado do presente prontuário histórico de vacinas e atendimentos. Comprometo-me a zelar por sua nutrição adequada, vacinação e vermifugação periódicas, abrigo seguro, cuidados médico-veterinários e guarda responsável, vedados quaisquer maus-tratos, abandono ou repasse a terceiros sem prévio conhecimento da entidade.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; margin-bottom: 24px;">
          <div>
            <div style="margin-bottom: 4px;"><strong>Nome do Adotante / Responsável:</strong> __________________________________________</div>
            <div style="margin-bottom: 4px;"><strong>CPF:</strong> ___________________________ &bull; <strong>RG:</strong> ___________________________</div>
            <div><strong>Telefone / WhatsApp:</strong> _____________________ &bull; <strong>Data:</strong> ____/____/________</div>
          </div>
          <div>
            <div style="margin-bottom: 4px;"><strong>Endereço Completo:</strong> __________________________________________________</div>
            <div style="margin-bottom: 4px;"><strong>Bairro / Cidade:</strong> __________________________________________________</div>
            <div><strong>E-mail:</strong> ______________________________________________________________</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-around; margin-top: 30px; text-align: center;">
          <div style="width: 42%;">
            <div style="border-top: 1px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 600; color: #0f172a;">
              Assinatura do Adotante / Tutor Responsável
            </div>
          </div>
          <div style="width: 42%;">
            <div style="border-top: 1px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 600; color: #0f172a;">
              Representante Oficial - ${this.escapeHtml(this.ongName)}
            </div>
          </div>
        </div>
      </div>
    `
      : '';

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Ficha do Pet #${pet.id} - ${this.escapeHtml(pet.nome)} - ${this.escapeHtml(this.ongName)}</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background-color: #fff; font-size: 12px; }
          
          .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
          .org-title { font-size: 18px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px 0; }
          .report-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 2px 0; }
          .report-subtitle { font-size: 11px; color: #64748b; margin: 0; }
          .meta-info { text-align: right; font-size: 11px; color: #64748b; }

          .pet-hero { display: flex; gap: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px; page-break-inside: avoid; }
          .pet-photo-container { width: 130px; height: 130px; border-radius: 8px; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; border: 1px solid #cbd5e1; flex-shrink: 0; }
          .pet-photo { width: 100%; height: 100%; object-fit: cover; }
          .pet-no-photo { text-align: center; color: #64748b; font-size: 11px; font-weight: 600; padding: 8px; }

          .grid-fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 12px; width: 100%; }
          .field-item { display: flex; flex-direction: column; }
          .field-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
          .field-value { font-size: 12px; color: #0f172a; font-weight: 600; }

          .section-title { font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin: 16px 0 8px 0; display: flex; justify-content: space-between; align-items: center; }

          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th { background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 700; text-transform: uppercase; text-align: left; padding: 6px 8px; border-bottom: 1px solid #cbd5e1; }

          .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }

          .no-print { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 12px; }
          .btn-print { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
          .btn-print:hover { background: #1d4ed8; }

          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            @page { margin: 10mm 12mm; size: A4 portrait; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
        </div>

        <div class="report-header">
          <div>
            <h1 class="org-title">🐾 ${this.escapeHtml(this.ongName)}</h1>
            <div class="report-title">${this.escapeHtml(tituloDocumento)}</div>
            <p class="report-subtitle">${this.escapeHtml(subtituloDocumento)}</p>
          </div>
          <div class="meta-info">
            <div><strong>Registro:</strong> #${pet.id}</div>
            <div><strong>Emissão:</strong> ${formattedDate}</div>
            <div>
              <span style="display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 9999px; font-weight: 700; ${this.getStatusStyle(pet.status)}">
                ${this.escapeHtml(pet.status)}
              </span>
            </div>
          </div>
        </div>

        <!-- Perfil e Foto do Pet -->
        <div class="pet-hero">
          <div class="pet-photo-container">
            ${
              fotoUrl
                ? `<img src="${fotoUrl}" alt="Foto de ${this.escapeHtml(pet.nome)}" class="pet-photo">`
                : `<div class="pet-no-photo">🐾<br>${this.escapeHtml(pet.tipo_pet)}<br><span style="font-size:9px;color:#94a3b8;">Sem foto</span></div>`
            }
          </div>
          <div class="grid-fields">
            <div class="field-item">
              <span class="field-label">Nome do Pet</span>
              <span class="field-value" style="font-size: 14px; color: #1e3a8a;">${this.escapeHtml(pet.nome)}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Espécie / Sexo</span>
              <span class="field-value">${this.escapeHtml(pet.tipo_pet)} &bull; ${this.escapeHtml(pet.sexo)}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Raça</span>
              <span class="field-value">${this.escapeHtml(pet.raca || 'SRD')}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Porte / Fase</span>
              <span class="field-value">${this.escapeHtml(pet.porte || 'N/I')} &bull; ${this.escapeHtml(pet.senioridade || 'N/I')}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Cor Majoritária</span>
              <span class="field-value">${this.escapeHtml(pet.cor_majoritaria || 'Não informada')}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Data de Nascimento</span>
              <span class="field-value">${this.formatDate(pet.data_nascimento)}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Castração</span>
              <span class="field-value">${pet.data_castracao ? `Sim (${this.formatDate(pet.data_castracao)})` : 'Não realizada'}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Microchip</span>
              <span class="field-value">${this.escapeHtml(pet.chip || 'Não implantado')}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Registro Geral (RGA)</span>
              <span class="field-value">${this.escapeHtml(pet.rga || '-')}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Código Moura</span>
              <span class="field-value">${this.escapeHtml(pet.moura || '-')}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Origem / Resgate</span>
              <span class="field-value">${this.escapeHtml(entrada?.local_origem || 'Não informada')}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Data de Entrada na ONG</span>
              <span class="field-value">${this.formatDate(entrada?.data_entrada)}</span>
            </div>
          </div>
        </div>

        <!-- Seção: Carteira de Vacinação -->
        <div class="section-title">
          <span>💉 Carteira de Vacinação & Imunizações</span>
          <span style="font-size: 10px; color: #64748b;">${vacinas.length} registro(s)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Vacina</th>
              <th style="width: 90px;">Data Prevista</th>
              <th style="width: 90px;">Data Aplicação</th>
              <th>Veterinário Responsável</th>
              <th style="width: 80px; text-align: center;">Status</th>
              ${incluirFinanceiro ? '<th style="width: 80px; text-align: right;">Custo</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${vacinasHtml}
          </tbody>
        </table>

        <!-- Seção: Procedimentos e Histórico Clínico -->
        <div class="section-title">
          <span>🩺 Prontuário Clínico, Consultas & Exames</span>
          <span style="font-size: 10px; color: #64748b;">${consultas.length} registro(s)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 90px;">Data</th>
              <th style="width: 140px;">Tipo de Procedimento</th>
              <th>Descrição / Medicamento</th>
              <th>Veterinário Responsável</th>
              ${incluirFinanceiro ? '<th style="width: 80px; text-align: right;">Custo</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${consultasHtml}
          </tbody>
        </table>

        <!-- Seção: Locais de Passagem (se houver) -->
        ${
          locaisHtml
            ? `
          <div class="section-title">
            <span>🏡 Histórico de Acomodação & Lares Temporários</span>
            <span style="font-size: 10px; color: #64748b;">${locais.length} local(is)</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Local / Lar Temporário</th>
                <th style="width: 90px;">Entrada</th>
                <th style="width: 90px;">Saída</th>
                <th>Motivo / Observação</th>
                ${incluirFinanceiro ? '<th style="width: 80px; text-align: right;">Auxílio</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${locaisHtml}
            </tbody>
          </table>
        `
            : ''
        }

        <!-- Seção Financeira (se solicitada) -->
        ${secaoFinanceiraHtml}

        <!-- Termo de Adoção e Assinaturas (se adotante/físico) -->
        ${termoAdoceaoHtml}

        <div class="footer">
          <span>${this.escapeHtml(this.ongName)} &bull; Sistema de Gestão Animal &bull; Prontuário gerado em conformidade com as diretrizes de guarda responsável.</span>
          <span>Ficha #${pet.id}</span>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Exporta a ficha do pet específico com suas vacinas e consultas para CSV (.csv com UTF-8 BOM)
   */
  exportPetSingleCsv(data: PetFichaReportData): void {
    if (!data.pet) return;

    const { pet, vacinas = [], consultas = [], locais = [], incluirFinanceiro = false } = data;
    const entrada = pet.entradas && pet.entradas.length > 0 ? pet.entradas[0] : null;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');

    const lines: string[] = [
      `${this.ongName} - Ficha do Animal #${pet.id} (${pet.nome})`,
      `Gerado em:;${formattedDate}`,
      '',
      'DADOS CADASTRAIS DO ANIMAL',
      `ID;${pet.id}`,
      `Nome;${this.escapeCsv(pet.nome)}`,
      `Espécie;${this.escapeCsv(pet.tipo_pet)}`,
      `Sexo;${this.escapeCsv(pet.sexo)}`,
      `Status;${this.escapeCsv(pet.status)}`,
      `Raça;${this.escapeCsv(pet.raca || 'SRD')}`,
      `Porte;${this.escapeCsv(pet.porte || 'Não informado')}`,
      `Fase da Vida;${this.escapeCsv(pet.senioridade || 'Não informada')}`,
      `Cor Majoritária;${this.escapeCsv(pet.cor_majoritaria || 'Não informada')}`,
      `Data de Nascimento;${this.formatDate(pet.data_nascimento)}`,
      `Castrado;${pet.data_castracao ? `Sim (${this.formatDate(pet.data_castracao)})` : 'Não'}`,
      `Microchip;${this.escapeCsv(pet.chip ? `'${pet.chip}` : 'Não implantado')}`,
      `RGA;${this.escapeCsv(pet.rga || '')}`,
      `Código Moura;${this.escapeCsv(pet.moura || '')}`,
      `Origem / Resgate;${this.escapeCsv(entrada?.local_origem || 'Não informada')}`,
      `Data de Entrada;${this.formatDate(entrada?.data_entrada)}`,
      `Resgatante;${this.escapeCsv(entrada?.resgatante || 'Não informado')}`,
      '',
      'CARTEIRA DE VACINAÇÃO',
      incluirFinanceiro
        ? 'Vacina;Data Prevista;Data Aplicação;Veterinário;Status;Custo'
        : 'Vacina;Data Prevista;Data Aplicação;Veterinário;Status',
    ];

    if (vacinas.length > 0) {
      for (const v of vacinas) {
        const row = [
          this.escapeCsv(v.nome_vacina),
          this.formatDate(v.data_prevista),
          this.formatDate(v.data_aplicacao),
          this.escapeCsv(v.veterinario?.nome || 'Não informado'),
          v.data_aplicacao ? 'Aplicada' : 'Prevista',
        ];
        if (incluirFinanceiro) {
          row.push(this.formatCurrency(v.custo));
        }
        lines.push(row.join(';'));
      }
    } else {
      lines.push('Nenhuma vacina cadastrada;;;;');
    }

    lines.push('');
    lines.push('HISTÓRICO CLÍNICO E PROCEDIMENTOS');
    lines.push(
      incluirFinanceiro
        ? 'Data;Tipo;Procedimento/Medicamento;Veterinário;Custo'
        : 'Data;Tipo;Procedimento/Medicamento;Veterinário',
    );

    if (consultas.length > 0) {
      for (const c of consultas) {
        const row = [
          this.formatDate(c.data_realizacao),
          this.escapeCsv(c.tipo_operacao),
          this.escapeCsv(c.operacao_medicamento),
          this.escapeCsv(c.veterinario?.nome || 'Não informado'),
        ];
        if (incluirFinanceiro) {
          row.push(this.formatCurrency(c.custo));
        }
        lines.push(row.join(';'));
      }
    } else {
      lines.push('Nenhum procedimento cadastrado;;;;');
    }

    if (locais.length > 0) {
      lines.push('');
      lines.push('HISTÓRICO DE ACOMODAÇÃO / LOCAIS');
      lines.push('Local;Data Saída/Acomodação;Data Reentrada;Motivo');
      for (const l of locais) {
        lines.push(
          [
            this.escapeCsv(l.local?.local || l.locais?.local || `Local #${l.id_local}`),
            this.formatDate(l.data_saida),
            this.formatDate(l.data_reentrada),
            this.escapeCsv(l.motivo_saida || l.obs || l.observacoes || ''),
          ].join(';'),
        );
      }
    }

    if (incluirFinanceiro && data.totalInvestido !== undefined) {
      lines.push('');
      lines.push('RESUMO FINANCEIRO');
      lines.push(`Total Investido;${this.formatCurrency(data.totalInvestido)}`);
      lines.push(`Vacinas;${this.formatCurrency(data.totalCustoVacinas)}`);
      lines.push(`Procedimentos;${this.formatCurrency(data.totalCustoConsultas)}`);
      lines.push(`Auxílio Moradia;${this.formatCurrency(data.totalCustoAuxilio)}`);
      lines.push(`Despesas ONG;${this.formatCurrency(data.totalCustoDespesas)}`);
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safePetName = pet.nome.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileDate = now.toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `ficha-pet-${pet.id}-${safePetName}-${fileDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private formatCurrency(value?: number | null): string {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (str.includes(';') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDate(dateVal?: string | null): string {
    if (!dateVal) return '-';
    try {
      const parts = dateVal.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR');
      }
    } catch {
      // fallback
    }
    return dateVal;
  }

  private getStatusStyle(status?: string | null): string {
    const s = (status || '').toLowerCase();
    if (s.includes('dispon'))
      return 'background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;';
    if (s.includes('tratamento'))
      return 'background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a;';
    if (s.includes('quarentena'))
      return 'background-color: #ffedd5; color: #c2410c; border: 1px solid #fed7aa;';
    if (s.includes('adot'))
      return 'background-color: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe;';
    if (s.includes('óbit') || s.includes('obit'))
      return 'background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;';
    return 'background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;';
  }
}
