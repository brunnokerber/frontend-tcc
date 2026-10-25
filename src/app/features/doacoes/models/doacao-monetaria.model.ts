import { Audit } from '@core/audit/models/audit.model';

export interface DoacaoMonetaria extends Audit {
  id: number;
  valor: number;
  doador: string;
  telefone: string | null;
  data_doacao: string;
  observacoes: string | null;
}

export interface DoacaoMonetariaCreateDto {
  valor: number;
  doador: string;
  telefone?: string | null;
  data_doacao?: string;
  observacoes?: string | null;
}

export interface DoacaoMonetariaUpdateDto {
  valor?: number;
  doador?: string;
  telefone?: string | null;
  data_doacao?: string;
  observacoes?: string | null;
}

export interface DoacaoMonetariaFilter {
  searchField?: string;
  searchValue?: string;
  dataInicio?: string;
  dataFim?: string;
}

export const DOACAO_MONETARIA_SEARCH_FIELDS = [
  { value: 'doador', label: 'Nome do Doador', placeholder: 'Buscar por nome do doador...' },
  { value: 'telefone', label: 'Telefone do Doador', placeholder: 'Buscar por telefone...' },
] as const;

/**
 * Formata um valor numérico para exibição em moeda Real Brasileiro (BRL).
 */
export function formatCurrencyBRL(valor?: number | null): string {
  if (valor === undefined || valor === null || isNaN(valor)) {
    return 'R$ 0,00';
  }
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
