import { Audit } from '@core/audit/models/audit.model';

export type DoacaoStatus = 'disponivel' | 'parcial' | 'esgotado';

export interface Doacao extends Audit {
  id: number;
  tipo_doacao: string; // Ex: 'Ração', 'Medicamento', 'Material de Limpeza', 'Acessórios'
  volume: number;
  unidade_medida: string;
  doador: string;
  telefone: string | null;

  // Propriedades calculadas e relacionais da camada de domínio
  direcionamentos?: DirecionamentoDoacao[];
  volume_direcionado?: number;
  volume_disponivel?: number;
  percentual_direcionado?: number;
  status?: DoacaoStatus;
}

export interface LocalResumido {
  id: number;
  local: string;
  tipo_local?: string | null;
  contato?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface DirecionamentoDoacao extends Audit {
  id: number;
  id_local: number;
  id_doacao: number;
  volume: number;

  // Entidades relacionadas (Join do Supabase)
  local?: LocalResumido;
  doacao?: Doacao;
}

export interface DoacaoCreateDto {
  tipo_doacao: string;
  volume: number;
  doador: string;
  telefone?: string | null;
  unidade_medida: string;
}

export interface DoacaoUpdateDto {
  tipo_doacao?: string;
  volume?: number;
  doador?: string;
  telefone?: string | null;
  unidade_medida?: string;
}

export interface DirecionamentoCreateDto {
  id_doacao: number;
  id_local: number;
  volume: number;
}

export interface DirecionamentoUpdateDto {
  id_local?: number;
  volume?: number;
}

export interface DoacaoFilter {
  searchField?: string;
  searchValue?: string;
  status?: 'todos' | DoacaoStatus;
}

export interface DirecionamentoFilter {
  id_local?: number;
  id_doacao?: number;
}

export const TIPOS_DOACAO_SUGESTOES: readonly string[] = [
  'Ração',
  'Medicamento',
  'Material de Limpeza',
  'Cobertores/Camas',
  'Acessórios',
  'Outro',
];

export const UNIDADES_MEDIDA_SUGESTOES: readonly string[] = [
  'kg',
  'litros',
  'un',
  'sacos',
  'pacotes',
  'caixas',
  'latas',
  'fardos',
];

export const DOACAO_SEARCH_FIELDS = [
  { value: 'doador', label: 'Nome do Doador', placeholder: 'Buscar por nome do doador...' },
  { value: 'tipo_doacao', label: 'Tipo de Doação', placeholder: 'Ex: Ração, Medicamento...' },
  { value: 'telefone', label: 'Telefone do Doador', placeholder: 'Buscar por telefone...' },
  { value: 'unidade_medida', label: 'Unidade de Medida', placeholder: 'Ex: kg, litros, un...' },
] as const;

/**
 * Soma o volume total direcionado a partir da lista de direcionamentos de uma doação.
 */
export function calcularVolumeDirecionado(direcionamentos?: DirecionamentoDoacao[]): number {
  if (!direcionamentos || direcionamentos.length === 0) {
    return 0;
  }
  const total = direcionamentos.reduce((acc, curr) => acc + (Number(curr.volume) || 0), 0);
  return Number(total.toFixed(2));
}

/**
 * Calcula o saldo restante disponível para novos direcionamentos.
 */
export function calcularSaldoDisponivel(volumeTotal: number, volumeDirecionado: number): number {
  const saldo = Number(volumeTotal) - Number(volumeDirecionado);
  return Number(Math.max(0, saldo).toFixed(2));
}

/**
 * Computa o percentual distribuído da doação (0 a 100).
 */
export function calcularPercentualDirecionado(
  volumeTotal: number,
  volumeDirecionado: number,
): number {
  if (!volumeTotal || volumeTotal <= 0) {
    return 0;
  }
  const perc = (Number(volumeDirecionado) / Number(volumeTotal)) * 100;
  return Math.min(100, Math.max(0, Number(perc.toFixed(1))));
}

/**
 * Determina o status operacional da doação:
 * - 'disponivel': 0% direcionado (100% de saldo)
 * - 'parcial': 0% < direcionado < 100%
 * - 'esgotado': 100% direcionado (saldo zerado)
 */
export function calcularStatusDoacao(volumeTotal: number, volumeDirecionado: number): DoacaoStatus {
  if (volumeDirecionado <= 0) {
    return 'disponivel';
  }
  if (volumeDirecionado >= volumeTotal) {
    return 'esgotado';
  }
  return 'parcial';
}

/**
 * Enriquece uma doação vinda do banco com os campos computados de direcionamento.
 */
export function enriquecerDoacao(
  raw: Doacao,
  direcionamentos: DirecionamentoDoacao[] = [],
): Doacao {
  const volumeTotal = Number(raw.volume) || 0;
  const volumeDirecionado = calcularVolumeDirecionado(direcionamentos);
  const volumeDisponivel = calcularSaldoDisponivel(volumeTotal, volumeDirecionado);
  const percentual = calcularPercentualDirecionado(volumeTotal, volumeDirecionado);
  const status = calcularStatusDoacao(volumeTotal, volumeDirecionado);

  return {
    ...raw,
    volume: volumeTotal,
    direcionamentos,
    volume_direcionado: volumeDirecionado,
    volume_disponivel: volumeDisponivel,
    percentual_direcionado: percentual,
    status,
  };
}
