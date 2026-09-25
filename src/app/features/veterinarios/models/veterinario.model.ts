import { Audit } from '@core/audit/models/audit.model';

export interface Veterinario extends Audit {
  id: number;
  nome: string;
  telefone: string;
  crvet: string;
}

export interface VeterinarioCreateDto {
  nome: string;
  telefone: string;
  crvet: string;
}

export type VeterinarioUpdateDto = Partial<VeterinarioCreateDto>;

export interface VeterinarioFilter {
  searchField?: string;
  searchValue?: string;
}

export const VET_SEARCH_FIELDS_OPTIONS = [
  { label: 'Nome do Veterinário(a)', value: 'nome', placeholder: 'Ex: Dra. Juliana, Dr. Carlos...' },
  { label: 'CRVET', value: 'crvet', placeholder: 'Ex: RS-12345, 12345...' },
  { label: 'Telefone / WhatsApp', value: 'telefone', placeholder: 'Ex: (51) 99999-9999' },
] as const;
