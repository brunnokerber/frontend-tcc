import { Audit } from '@core/audit/models/audit.model';

export interface Local extends Audit {
  id: number;
  tipo_local: string;
  contato?: string | null;
  telefone?: string | null;
  local: string;
  bairro?: string | null;
  rua?: string | null;
  numero?: number | null;
  complemento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export interface LocalCreateDto {
  tipo_local: string;
  contato?: string | null;
  telefone?: string | null;
  local: string;
  bairro?: string | null;
  rua?: string | null;
  numero?: number | null;
  complemento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export type LocalUpdateDto = Partial<LocalCreateDto>;

export interface LocalFilter {
  search?: string;
  tipo_local?: string;
  cidade?: string;
  estado?: string;
}

export const TIPO_LOCAL_OPTIONS = [
  { label: 'Lar Temporário', value: 'Lar Temporário', icon: 'home' },
  { label: 'Clínica / Hospital Veterinário', value: 'Clínica Veterinária', icon: 'local_hospital' },
  { label: 'Abrigo / Canil', value: 'Abrigo', icon: 'holiday_village' },
  { label: 'Centro de Controle de Zoonoses (CCZ)', value: 'CCZ', icon: 'domain' },
  { label: 'Outro', value: 'Outro', icon: 'location_on' },
] as const;
