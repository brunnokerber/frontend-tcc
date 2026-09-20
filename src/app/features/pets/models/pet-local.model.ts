import { Audit } from '@core/audit/models/audit.model';
import { Local } from '@features/locais/models/local.model';

export interface PetLocal extends Audit {
  id?: number;
  id_pet: number;
  id_local: number;
  data_saida: string;
  data_reentrada?: string | null;
  motivo_saida?: string | null;
  valor_auxilio?: number | null;
  obs?: string | null;
  observacoes?: string | null;
  locais?: Local | null;
  local?: Local | null;
}

export interface PetLocalCreateDto {
  id_pet: number;
  id_local: number;
  data_saida: string;
  data_reentrada?: string | null;
  motivo_saida?: string | null;
  valor_auxilio?: number | null;
  obs?: string | null;
}

export type PetLocalUpdateDto = Partial<
  Omit<PetLocal, 'id' | 'created_at' | 'updated_at' | 'locais' | 'local'>
>;
