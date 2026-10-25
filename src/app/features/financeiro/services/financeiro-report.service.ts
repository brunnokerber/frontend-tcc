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
          <td style="text-align: right; font-weight: bold; color: ${m.tipo_movimentacao === 'Entrada' ? '#2e7d32' : '#c62828'};">
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
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #333;
      background: #fff;
      font-size: 11pt;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #2e7d32;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      margin: 0;
      font-size: 18pt;
      color: #1b5e20;
    }
    .header p {
      margin: 2px 0 0 0;
      font-size: 9pt;
      color: #666;
    }
    .period-badge {
      background: #f1f8e9;
      color: #2e7d32;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10pt;
      border: 1px solid #c8e6c9;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
      background: #fafafa;
    }
    .kpi-title {
      font-size: 8pt;
      text-transform: uppercase;
      color: #757575;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .kpi-val {
      font-size: 14pt;
      font-weight: bold;
    }
    .text-success { color: #2e7d32; }
    .text-danger { color: #c62828; }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      margin: 20px 0 8px 0;
      color: #37474f;
      border-bottom: 1px solid #cfd8dc;
      padding-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9.5pt;
    }
    th, td {
      border: 1px solid #e0e0e0;
      padding: 6px 8px;
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
      color: #424242;
      text-align: left;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8pt;
      font-weight: bold;
    }
    .badge-in { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .badge-out { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #888;
    }
    .signature-box {
      margin-top: 50px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 220px;
      border-top: 1px solid #555;
      padding-top: 5px;
      font-size: 9pt;
      color: #333;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${this.escapeHtml(this.ongName)}</h1>
      <p>Sistema de Gestão &bull; Relatório Oficial de Prestação de Contas</p>
    </div>
    <div style="text-align: right;">
      <span class="period-badge">Período: ${this.escapeHtml(periodoLabel)}</span>
      <p style="margin-top: 4px;">Emissão: ${dataEmissao}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Total Arrecadado</div>
      <div class="kpi-val text-success">R$ ${balanco.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <small style="font-size: 7.5pt; color: #666;">${balanco.qtdEntradas} doações</small>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Total Despesas</div>
      <div class="kpi-val text-danger">R$ ${balanco.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <small style="font-size: 7.5pt; color: #666;">${balanco.qtdSaidas} lançamentos</small>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Saldo Líquido</div>
      <div class="kpi-val ${saldoClass}">R$ ${balanco.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <small style="font-size: 7.5pt; font-weight: bold;" class="${saldoClass}">${saldoStatus}</small>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Taxa de Cobertura</div>
      <div class="kpi-val">${balanco.taxaCobertura.toFixed(1)}%</div>
      <small style="font-size: 7.5pt; color: #666;">Autonomia financeira</small>
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

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
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
