import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { extractErrorMessage } from '@shared/utils/supabase-error.utils';
import {
  BalancoFinanceiro,
  CategoriaConsolidada,
  FiltroFinanceiro,
  MesConsolidado,
  MovimentacaoFluxoCaixa,
  TipoPeriodoFiltro,
  TopPetCusto,
} from '../models/fluxo-caixa.model';

@Injectable({
  providedIn: 'root',
})
export class FinanceiroService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  // Inicializa com o mês atual
  public filtro = signal<FiltroFinanceiro>(this.calcularIntervaloPeriodo('mes_atual'));

  public movimentacoes = signal<MovimentacaoFluxoCaixa[]>([]);
  public petsMap = signal<Map<number, string>>(new Map());
  public loading = signal<boolean>(false);
  public error = signal<string | null>(null);

  /**
   * Resumo de Indicadores Principais (KPIs)
   */
  public balanco = computed<BalancoFinanceiro>(() => {
    const lista = this.movimentacoes();
    let totalEntradas = 0;
    let totalSaidas = 0;
    let qtdEntradas = 0;
    let qtdSaidas = 0;

    for (const mov of lista) {
      const val = Number(mov.valor) || 0;
      if (mov.tipo_movimentacao === 'Entrada') {
        totalEntradas += val;
        qtdEntradas++;
      } else {
        totalSaidas += val;
        qtdSaidas++;
      }
    }

    const saldoLiquido = totalEntradas - totalSaidas;
    const taxaCobertura =
      totalSaidas > 0 ? (totalEntradas / totalSaidas) * 100 : totalEntradas > 0 ? 100 : 0;
    const ticketMedioEntrada = qtdEntradas > 0 ? totalEntradas / qtdEntradas : 0;
    const ticketMedioSaida = qtdSaidas > 0 ? totalSaidas / qtdSaidas : 0;

    return {
      totalEntradas,
      totalSaidas,
      saldoLiquido,
      taxaCobertura,
      qtdEntradas,
      qtdSaidas,
      ticketMedioEntrada,
      ticketMedioSaida,
    };
  });

  /**
   * Distribuição consolidada de despesas por categoria
   */
  public despesasPorCategoria = computed<CategoriaConsolidada[]>(() => {
    const lista = this.movimentacoes();
    const categoriasMap = new Map<string, { total: number; qtd: number }>();
    let totalGeralSaidas = 0;

    for (const mov of lista) {
      if (mov.tipo_movimentacao === 'Saída') {
        const val = Number(mov.valor) || 0;
        totalGeralSaidas += val;
        const cat = mov.categoria || 'Outro';
        const atual = categoriasMap.get(cat) || { total: 0, qtd: 0 };
        categoriasMap.set(cat, { total: atual.total + val, qtd: atual.qtd + 1 });
      }
    }

    const resultado: CategoriaConsolidada[] = [];
    categoriasMap.forEach((dados, categoria) => {
      const percentual = totalGeralSaidas > 0 ? (dados.total / totalGeralSaidas) * 100 : 0;
      resultado.push({
        categoria,
        tipo: 'Saída',
        total: dados.total,
        quantidade: dados.qtd,
        percentual,
      });
    });

    return resultado.sort((a, b) => b.total - a.total);
  });

  /**
   * Evolução cronológica mensal de entradas vs saídas
   */
  public evolucaoMensal = computed<MesConsolidado[]>(() => {
    const lista = this.movimentacoes();
    const mesesMap = new Map<string, { entradas: number; saidas: number }>();

    for (const mov of lista) {
      if (!mov.data_movimentacao) continue;
      const chave = mov.data_movimentacao.substring(0, 7); // 'YYYY-MM'
      const atual = mesesMap.get(chave) || { entradas: 0, saidas: 0 };
      const val = Number(mov.valor) || 0;

      if (mov.tipo_movimentacao === 'Entrada') {
        atual.entradas += val;
      } else {
        atual.saidas += val;
      }
      mesesMap.set(chave, atual);
    }

    const mesesOrdenados = Array.from(mesesMap.keys()).sort(); // '2026-08', '2026-09', ...
    const mesesNomes = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];

    return mesesOrdenados.map((chave) => {
      const dados = mesesMap.get(chave)!;
      const [ano, mes] = chave.split('-');
      const mesIndex = parseInt(mes, 10) - 1;
      const label = `${mesesNomes[mesIndex] || mes}/${ano.substring(2)}`;

      return {
        chave,
        label,
        entradas: dados.entradas,
        saidas: dados.saidas,
        saldo: dados.entradas - dados.saidas,
      };
    });
  });

  /**
   * Top 5 animais com maior custo no período
   */
  public topPetsCusto = computed<TopPetCusto[]>(() => {
    const lista = this.movimentacoes();
    const petCosts = new Map<number, { total: number; qtd: number }>();
    const pMap = this.petsMap();

    for (const mov of lista) {
      if (mov.tipo_movimentacao === 'Saída' && mov.id_pet) {
        const val = Number(mov.valor) || 0;
        const atual = petCosts.get(mov.id_pet) || { total: 0, qtd: 0 };
        petCosts.set(mov.id_pet, { total: atual.total + val, qtd: atual.qtd + 1 });
      }
    }

    const resultado: TopPetCusto[] = [];
    petCosts.forEach((dados, id_pet) => {
      const nome_pet = pMap.get(id_pet) || `Pet #${id_pet}`;
      resultado.push({
        id_pet,
        nome_pet,
        totalGasto: dados.total,
        quantidadeProcedimentos: dados.qtd,
      });
    });

    return resultado.sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 5);
  });

  /**
   * Carrega os dados consolidados do fluxo de caixa e os nomes dos pets
   */
  async carregarFluxoCaixa(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filtro();

    try {
      // 1. Carrega view de fluxo de caixa filtrada pelo período
      const { data, error } = await this.supabase.client
        .from('vw_fluxo_caixa')
        .select('*')
        .gte('data_movimentacao', f.dataInicio)
        .lte('data_movimentacao', f.dataFim)
        .order('data_movimentacao', { ascending: false });

      if (error) {
        throw error;
      }

      const lista = (data as unknown as MovimentacaoFluxoCaixa[]) || [];
      this.movimentacoes.set(lista);

      // 2. Carrega nomes de pets que aparecem nas movimentações para exibir nos insights
      const petIds = Array.from(
        new Set(lista.filter((m) => m.id_pet !== null).map((m) => m.id_pet!)),
      );

      if (petIds.length > 0) {
        const { data: petsData } = await this.supabase.client
          .from('pets')
          .select('id, nome')
          .in('id', petIds);

        if (petsData) {
          const map = new Map<number, string>();
          for (const p of petsData as { id: number; nome: string }[]) {
            map.set(p.id, p.nome);
          }
          this.petsMap.set(map);
        }
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao carregar dados do fluxo de caixa.');
      this.error.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Aplica um novo filtro de período e recarrega os dados
   */
  async aplicarFiltro(
    tipo: TipoPeriodoFiltro,
    dataInicioCustom?: string,
    dataFimCustom?: string,
  ): Promise<void> {
    if (tipo === 'customizado') {
      if (!dataInicioCustom || !dataFimCustom) return;
      this.filtro.set({
        tipo: 'customizado',
        dataInicio: dataInicioCustom,
        dataFim: dataFimCustom,
      });
    } else {
      this.filtro.set(this.calcularIntervaloPeriodo(tipo));
    }

    await this.carregarFluxoCaixa();
  }

  /**
   * Auxiliar determinístico para computar datas de início e fim dos períodos pré-definidos
   */
  public calcularIntervaloPeriodo(tipo: TipoPeriodoFiltro): FiltroFinanceiro {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0 a 11

    const formatar = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    switch (tipo) {
      case 'mes_atual': {
        const inicio = new Date(anoAtual, mesAtual, 1);
        const fim = new Date(anoAtual, mesAtual + 1, 0); // Último dia do mês atual
        return { tipo, dataInicio: formatar(inicio), dataFim: formatar(fim) };
      }
      case 'ultimo_mes': {
        const inicio = new Date(anoAtual, mesAtual - 1, 1);
        const fim = new Date(anoAtual, mesAtual, 0); // Último dia do mês anterior
        return { tipo, dataInicio: formatar(inicio), dataFim: formatar(fim) };
      }
      case 'trimestre': {
        // Últimos 90 dias
        const inicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { tipo, dataInicio: formatar(inicio), dataFim: formatar(hoje) };
      }
      case 'ano': {
        const inicio = new Date(anoAtual, 0, 1);
        const fim = new Date(anoAtual, 11, 31);
        return { tipo, dataInicio: formatar(inicio), dataFim: formatar(fim) };
      }
      default: {
        const inicio = new Date(anoAtual, mesAtual, 1);
        const fim = new Date(anoAtual, mesAtual + 1, 0);
        return { tipo: 'mes_atual', dataInicio: formatar(inicio), dataFim: formatar(fim) };
      }
    }
  }
}
