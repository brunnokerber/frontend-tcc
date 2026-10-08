import { Audit } from '@core/audit/models/audit.model';

export interface Voluntario extends Audit {
  id: number;
  nome: string;
  email?: string | null;
  telefone: string;
  dias_semana: string[];
  turnos: string[];
  observacoes?: string | null;
}

export type VoluntarioDTO = Omit<Voluntario, 'id' | 'created_at' | 'updated_at'>;

export type VoluntarioCreateDto = VoluntarioDTO;

export type VoluntarioUpdateDto = Partial<VoluntarioDTO>;

export const DIAS_SEMANA_OPTIONS = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const;

export type DiaSemana = (typeof DIAS_SEMANA_OPTIONS)[number];

export const TURNOS_OPTIONS = ['Manhã', 'Tarde', 'Noite'] as const;

export type Turno = (typeof TURNOS_OPTIONS)[number];

export interface VoluntarioFilter {
  searchField?: 'nome' | 'telefone' | 'email';
  searchValue?: string;
  dia_semana?: string | null;
  turno?: string | null;
}

export const VOLUNTARIO_SEARCH_FIELDS_OPTIONS = [
  { label: 'Nome do Voluntário(a)', value: 'nome', placeholder: 'Ex: Maria Silva, João...' },
  { label: 'Telefone / WhatsApp', value: 'telefone', placeholder: 'Ex: (51) 99999-9999' },
  { label: 'E-mail', value: 'email', placeholder: 'Ex: voluntario@email.com' },
] as const;
