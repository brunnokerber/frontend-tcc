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
  search?: string;
}
