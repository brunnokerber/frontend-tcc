import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import {
  BalancoFinanceiro,
  CategoriaConsolidada,
  MovimentacaoFluxoCaixa,
} from '../models/fluxo-caixa.model';

@Injectable({
  providedIn: 'root',
})
export class FinanceiroReportService {
  private readonly ongName = environment.ongName;

  /**
   * Exporta os lançamentos e balanço do período para arquivo CSV (Excel com UTF-8 BOM)
   */
  exportToCsv(
    movimentacoes: MovimentacaoFluxoCaixa[],
    balanco: BalancoFinanceiro,
    periodoLabel: string,
  ): void {
    if (!movimentacoes || movimentacoes.length === 0) {
      return;
    }

    const headers = [
      'Tipo de Movimentação',
      'Categoria',
      'Data',
      'Pessoa / Referência',
      'Valor (R$)',
      'ID Pet',
      'Observações',
    ];

    const rows = movimentacoes.map((m) => [
      m.tipo_movimentacao,
      this.escapeCsv(m.categoria),
      this.formatDate(m.data_movimentacao),
      this.escapeCsv(m.pessoa_referencia),
      Number(m.valor).toFixed(2).replace('.', ','),
      m.id_pet ? String(m.id_pet) : '',
      this.escapeCsv(m.observacoes || ''),
    ]);

    // Linhas de Resumo / Balanço
    const summaryRows = [
      [],
      ['--- RESUMO DO BALANÇO FINANCEIRO ---'],
      ['Período', this.escapeCsv(periodoLabel)],
      ['Total de Entradas (R$)', balanco.totalEntradas.toFixed(2).replace('.', ',')],
      ['Total de Saídas (R$)', balanco.totalSaidas.toFixed(2).replace('.', ',')],
      ['Saldo Líquido (R$)', balanco.saldoLiquido.toFixed(2).replace('.', ',')],
      ['Taxa de Cobertura (%)', `${balanco.taxaCobertura.toFixed(1).replace('.', ',')}%`],
    ];

    const csvContent =
      '\uFEFF' +
      [
        headers.join(';'),
        ...rows.map((r) => r.join(';')),
        ...summaryRows.map((r) => r.join(';')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `balanco_financeiro_${this.slugify(this.ongName)}_${timestamp}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Gera relatório/balancete de prestação de contas pronto para impressão ou salvar em PDF
   */
  printBalancetePdf(
    movimentacoes: MovimentacaoFluxoCaixa[],
    balanco: BalancoFinanceiro,
    categorias: CategoriaConsolidada[],
    periodoLabel: string,
  ): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para gerar a impressão do relatório em PDF.');
      return;
    }

    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const saldoClass = balanco.saldoLiquido >= 0 ? 'text-success' : 'text-danger';
    const saldoStatus = balanco.saldoLiquido >= 0 ? 'SUPERÁVIT OPERACIONAL' : 'DÉFICIT OPERACIONAL';

    const categoriasHtml = categorias
      .map(
        (c) => `
        <tr>
          <td>${this.escapeHtml(c.categoria)}</td>
          <td style="text-align: center;">${c.quantidade}</td>
          <td style="text-align: right;">R$ ${c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${c.percentual.toFixed(1)}%</td>
        </tr>`,
      )
      .join('');

    const lancamentosHtml = movimentacoes
      .map(
        (m) => `
        <tr>
          <td style="text-align: center;">
            <span class="badge ${m.tipo_movimentacao === 'Entrada' ? 'badge-in' : 'badge-out'}">
              ${m.tipo_movimentacao}
            </span>
          </td>
          <td>${this.escapeHtml(m.categoria)}</td>
          <td>${this.formatDate(m.data_movimentacao)}</td>
          <td>${this.escapeHtml(m.pessoa_referencia)}</td>
          <td style="text-align: right; font-weight: bold; color: ${m.tipo_movimentacao === 'Entrada' ? '#16a34a' : '#dc2626'};">
            ${m.tipo_movimentacao === 'Entrada' ? '+' : '-'} R$ ${Number(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Balanço Financeiro & Prestação de Contas - ${this.escapeHtml(this.ongName)}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body {
      color: #0f172a;
      background: #fff;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
      padding: 24px;
    }
    .no-print {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 16px;
    }
    .btn-print {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: background-color 0.15s ease;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    .report-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .org-title {
      font-size: 20px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0 0 4px 0;
    }
    .report-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .meta-info {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }
    .period-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
      border: 1px solid #cbd5e1;
      margin-bottom: 4px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .stat-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .stat-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 500;
    }
    .text-success { color: #16a34a; }
    .text-danger { color: #dc2626; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      margin: 20px 0 8px 0;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      border-bottom: 2px solid #cbd5e1;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-in { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
    .badge-out { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    .signature-box {
      margin-top: 40px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 240px;
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 12px;
      color: #475569;
      font-weight: 500;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
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
      <p class="report-subtitle">Sistema de Gestão &bull; Relatório Oficial de Prestação de Contas</p>
    </div>
    <div class="meta-info">
      <div><span class="period-badge">Período: ${this.escapeHtml(periodoLabel)}</span></div>
      <div><strong>Emissão:</strong> ${dataEmissao}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-label">Total Arrecadado</div>
      <div class="stat-value text-success">R$ ${balanco.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub">${balanco.qtdEntradas} doações</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Total Despesas</div>
      <div class="stat-value text-danger">R$ ${balanco.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub">${balanco.qtdSaidas} lançamentos</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Saldo Líquido</div>
      <div class="stat-value ${saldoClass}">R$ ${balanco.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub ${saldoClass}" style="font-weight: 700;">${saldoStatus}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Taxa de Cobertura</div>
      <div class="stat-value">${balanco.taxaCobertura.toFixed(1)}%</div>
      <div class="stat-sub">Autonomia financeira</div>
    </div>
  </div>

  <div class="section-title">1. Despesas por Categoria</div>
  <table>
    <thead>
      <tr>
        <th>Categoria de Gasto</th>
        <th style="width: 100px; text-align: center;">Quantidade</th>
        <th style="width: 130px; text-align: right;">Total (R$)</th>
        <th style="width: 100px; text-align: right;">% do Total</th>
      </tr>
    </thead>
    <tbody>
      ${categoriasHtml.length > 0 ? categoriasHtml : '<tr><td colspan="4" style="text-align: center;">Nenhuma despesa registrada no período.</td></tr>'}
    </tbody>
  </table>

  <div class="section-title">2. Lançamentos Detalhados do Período</div>
  <table>
    <thead>
      <tr>
        <th style="width: 70px; text-align: center;">Tipo</th>
        <th>Categoria</th>
        <th style="width: 85px;">Data</th>
        <th>Pessoa / Favorecido / Pet</th>
        <th style="width: 120px; text-align: right;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${lancamentosHtml.length > 0 ? lancamentosHtml : '<tr><td colspan="5" style="text-align: center;">Nenhuma movimentação registrada no período.</td></tr>'}
    </tbody>
  </table>

  <div class="signature-box">
    <div class="signature-line">
      Responsável Financeiro / Tesouraria
    </div>
    <div class="signature-line">
      Diretoria Executiva / Presidência
    </div>
  </div>

  <div class="footer">
    <span>Documento gerado eletronicamente por Peludinhos do Vale - Gestão Animal</span>
    <span>Página 1 de 1</span>
  </div>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private escapeCsv(val: string): string {
    if (!val) return '""';
    const clean = String(val).replace(/"/g, '""');
    return `"${clean}"`;
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '');
  }
}
