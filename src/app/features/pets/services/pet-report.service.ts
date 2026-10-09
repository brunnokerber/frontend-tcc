import { Injectable } from '@angular/core';
import { Pet } from '../models/pet.model';

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

@Injectable({
  providedIn: 'root',
})
export class PetReportService {
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
      ['Peludinhos do Vale - Relatório de Pets'],
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
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no navegador para visualizar e imprimir o relatório em PDF.');
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');

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
        <title>Relatório de Pets - Peludinhos do Vale</title>
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
          .btn-print { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; }
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
            <h1 class="org-title">🐾 Peludinhos do Vale</h1>
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
          <span>Peludinhos do Vale &bull; Documento gerado eletronicamente para fins de controle e auditoria interna.</span>
          <span>Página 1</span>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
    if (s.includes('dispon')) return 'background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;';
    if (s.includes('tratamento')) return 'background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a;';
    if (s.includes('quarentena')) return 'background-color: #ffedd5; color: #c2410c; border: 1px solid #fed7aa;';
    if (s.includes('adot')) return 'background-color: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe;';
    if (s.includes('óbit') || s.includes('obit')) return 'background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;';
    return 'background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;';
  }
}
