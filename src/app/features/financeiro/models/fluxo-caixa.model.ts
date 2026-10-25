export type TipoMovimentacao = 'Entrada' | 'Saída';

export interface MovimentacaoFluxoCaixa {
  tipo_movimentacao: TipoMovimentacao;
  categoria: string;
  valor: number;
  data_movimentacao: string; // YYYY-MM-DD
  pessoa_referencia: string;
  observacoes: string | null;
  id_pet: number | null;
  created_at: string;
}

export interface BalancoFinanceiro {
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
  taxaCobertura: number; // % (entradas / saidas * 100)
  qtdEntradas: number;
  qtdSaidas: number;
  ticketMedioEntrada: number;
  ticketMedioSaida: number;
}

export interface CategoriaConsolidada {
  categoria: string;
  tipo: TipoMovimentacao;
  total: number;
  quantidade: number;
  percentual: number; // % em relação ao total do tipo
}

export interface MesConsolidado {
  chave: string; // YYYY-MM
  label: string; // ex: 'Out/26'
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface TopPetCusto {
  id_pet: number;
  nome_pet: string;
  totalGasto: number;
  quantidadeProcedimentos: number;
}

export type TipoPeriodoFiltro = 'mes_atual' | 'ultimo_mes' | 'trimestre' | 'ano' | 'customizado';

export interface FiltroFinanceiro {
  tipo: TipoPeriodoFiltro;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
}
