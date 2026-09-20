import { Audit } from '@core/audit/models/audit.model';
import { Veterinario } from '@features/veterinarios/models/veterinario.model';

export interface Vacina extends Audit {
  id?: number;
  id_pet: number;
  nome_vacina: string;
  data_prevista: string;
  data_aplicacao?: string | null;
  custo?: number | null;
  id_veterinario?: number | null;
  veterinario?: Veterinario | null;
}

export interface VacinaCreateDto {
  id_pet: number;
  nome_vacina: string;
  data_prevista: string;
  data_aplicacao?: string | null;
  custo?: number | null;
  id_veterinario?: number | null;
}

export type VacinaUpdateDto = Partial<
  Omit<Vacina, 'id' | 'created_at' | 'updated_at' | 'veterinario'>
>;

export const VACINAS_SUGESTOES = [
  'V8 (Óctupla Canina)',
  'V10 (Déctupla Canina)',
  'Antirrábica (Raiva)',
  'Giárdiase',
  'Gripe Canina (Tosse dos Canis)',
  'Leishmaniose',
  'Tríplice Felina (V3)',
  'Quádrupla Felina (V4)',
  'Quíntupla Felina (V5)',
] as const;

export type SortOrderMode = 'cronologico' | 'valor';
