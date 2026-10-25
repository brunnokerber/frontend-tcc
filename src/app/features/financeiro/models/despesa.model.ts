import { Audit } from '@core/audit/models/audit.model';

export const DESPESA_CATEGORIAS = [
  'Alimentação / Ração',
  'Medicamentos & Insumos Gerais',
  'Higiene & Limpeza',
  'Transporte & Resgate',
  'Infraestrutura & Sede',
  'Serviços Veterinários Avulsos',
  'Administrativo & Operacional',
  'Outro',
] as const;

export type DespesaCategoria = (typeof DESPESA_CATEGORIAS)[number];

export interface Despesa extends Audit {
  id: number;
  descricao: string;
  categoria: DespesaCategoria | string;
  valor: number;
  data_despesa: string; // YYYY-MM-DD
  favorecido: string;
  telefone: string | null;
  observacoes: string | null;
  id_pet: number | null;
  pet?: {
    id: number;
    nome: string;
    tipo_pet?: string;
  } | null;
}

export interface DespesaCreateDto {
  descricao: string;
  categoria: DespesaCategoria | string;
  valor: number;
  data_despesa: string;
  favorecido: string;
  telefone?: string | null;
  observacoes?: string | null;
  id_pet?: number | null;
}

export interface DespesaUpdateDto {
  descricao?: string;
  categoria?: DespesaCategoria | string;
  valor?: number;
  data_despesa?: string;
  favorecido?: string;
  telefone?: string | null;
  observacoes?: string | null;
  id_pet?: number | null;
}

export interface DespesaFilter {
  searchTerm?: string;
  categoria?: string;
  dataInicio?: string;
  dataFim?: string;
  id_pet?: number | null;
}
