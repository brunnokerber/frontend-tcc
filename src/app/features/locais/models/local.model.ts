import { Audit } from '@core/audit/models/audit.model';

export interface Local extends Audit {
  id: number;
  tipo_local: string;
  contato: string;
  telefone: string;
  local: string;
  bairro: string;
  rua: string;
  numero: number;
  complemento?: string | null;
  cidade: string;
  estado: string;
  cep: string;
}

export interface LocalCreateDto {
  tipo_local: string;
  contato: string;
  telefone: string;
  local: string;
  bairro: string;
  rua: string;
  numero: number;
  complemento?: string | null;
  cidade: string;
  estado: string;
  cep: string;
}

export type LocalUpdateDto = Partial<LocalCreateDto>;

export interface LocalFilter {
  searchField?: string;
  searchValue?: string;
}

export const SEARCH_FIELDS_OPTIONS = [
  { label: 'Nome do Local / Estabelecimento', value: 'local', placeholder: 'Ex: Lar Esperança, Clínica Vet...' },
  { label: 'Tipo de Local', value: 'tipo_local', placeholder: 'Selecione o tipo de local...' },
  { label: 'Pessoa de Contato / Responsável', value: 'contato', placeholder: 'Ex: Dra. Mariana, João Silva...' },
  { label: 'Telefone / WhatsApp', value: 'telefone', placeholder: 'Ex: (51) 99999-9999' },
  { label: 'Cidade', value: 'cidade', placeholder: 'Ex: Novo Hamburgo, São Leopoldo...' },
  { label: 'Bairro', value: 'bairro', placeholder: 'Ex: Centro, Rio Branco...' },
] as const;

export const TIPO_LOCAL_OPTIONS = [
  { label: 'Lar Temporário', value: 'Lar Temporário', icon: 'home' },
  { label: 'Clínica Veterinária', value: 'Clínica Veterinária', icon: 'local_hospital' },
  { label: 'Feira / Evento de Exposição', value: 'Exposição', icon: 'storefront' },
  { label: 'Abrigo / Canil', value: 'Abrigo', icon: 'holiday_village' },
  { label: 'Centro de Controle de Zoonoses (CCZ)', value: 'CCZ', icon: 'domain' },
  { label: 'Outro', value: 'Outro', icon: 'location_on' },
] as const;
