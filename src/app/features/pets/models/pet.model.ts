export interface Pet {
  id: number;
  tipo_pet: string;
  sexo: string;
  status: string;
  nome: string;
  data_nascimento: string | null;
  data_castracao: string | null;
  link_documentos: string | null;
  cor_majoritaria: string | null;
  porte: string | null;
  moura: string | null;
  chip: string | null;
  rga: string | null;
  created_at?: string;
  updated_at?: string;
  entradas?: Entrada[];
}

export interface Entrada {
  id?: number;
  id_usuario: string;
  id_pet: number;
  local_origem: string;
  data_entrada: string;
  created_at?: string;
  updated_at?: string;
}

export interface PetCreateDto {
  tipo_pet: string;
  sexo: string;
  status: string;
  nome: string;
  data_nascimento: string | null;
  data_castracao: string | null;
  link_documentos: string | null;
  cor_majoritaria: string | null;
  porte: string | null;
  moura: string | null;
  chip: string | null;
  rga: string | null;
  // Dados para registro de entrada
  local_origem: string;
  data_entrada: string;
}

export type PetUpdateDto = Partial<Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'entradas'>>;

export interface PetFilter {
  search?: string;
  tipo_pet?: string;
  sexo?: string;
  status?: string;
  porte?: string;
}

export const TIPO_PET_OPTIONS = [
  { label: 'Cachorro', value: 'Cachorro', icon: 'pets' },
  { label: 'Gato', value: 'Gato', icon: 'cruelty_free' },
  { label: 'Outro', value: 'Outro', icon: 'pest_control_rodent' }
] as const;

export const SEXO_OPTIONS = [
  { label: 'Macho', value: 'Macho', icon: 'male' },
  { label: 'Fêmea', value: 'Fêmea', icon: 'female' }
] as const;

export const STATUS_OPTIONS = [
  { label: 'Disponível', value: 'Disponível', badgeClass: 'badge-status-disponivel' },
  { label: 'Em Tratamento', value: 'Em Tratamento', badgeClass: 'badge-status-tratamento' },
  { label: 'Lar Temporário', value: 'Lar Temporário', badgeClass: 'badge-status-lar' },
  { label: 'Quarentena', value: 'Quarentena', badgeClass: 'badge-status-quarentena' },
  { label: 'Adotado', value: 'Adotado', badgeClass: 'badge-status-adotado' },
  { label: 'Óbito', value: 'Óbito', badgeClass: 'badge-status-obito' }
] as const;

export const PORTE_OPTIONS = [
  { label: 'Mini', value: 'Mini' },
  { label: 'Pequeno', value: 'Pequeno' },
  { label: 'Médio', value: 'Médio' },
  { label: 'Grande', value: 'Grande' },
  { label: 'Gigante', value: 'Gigante' }
] as const;
