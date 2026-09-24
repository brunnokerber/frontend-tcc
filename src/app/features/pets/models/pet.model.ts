import { Audit } from '@core/audit/models/audit.model';
import { ConsultaExame } from './consulta-exame.model';
import { PetLocal } from './pet-local.model';
import { Vacina } from './vacina.model';

export * from './consulta-exame.model';
export * from './pet-local.model';
export * from './vacina.model';

export interface Pet extends Audit {
  id: number;
  tipo_pet: string;
  sexo: string;
  status: string;
  nome: string;
  senioridade: string;
  data_nascimento?: string | null;
  data_castracao?: string | null;
  link_documentos?: string | null;
  cor_majoritaria?: string | null;
  raca: string;
  porte: string;
  moura?: string | null;
  chip?: string | null;
  rga?: string | null;
  entradas?: Entrada[];
  vacinas?: Vacina[];
  consultas_exames?: ConsultaExame[];
  pets_locais?: PetLocal[];
}

export interface Entrada extends Audit {
  id?: number;
  id_usuario: string;
  id_pet: number;
  local_origem: string;
  data_entrada: string;
  resgatante: string;
  observacoes?: string | null;
}

export interface PetCreateDto extends entradaDto {
  tipo_pet: string;
  sexo: string;
  status: string;
  nome: string;
  senioridade: string;
  data_nascimento?: string | null;
  data_castracao?: string | null;
  link_documentos?: string | null;
  cor_majoritaria: string | null;
  raca: string;
  porte: string;
  moura?: string | null;
  chip?: string | null;
  rga?: string | null;
}

interface entradaDto {
  local_origem: string;
  data_entrada: string;
  resgatante: string;
  observacoes?: string | null;
}

export type PetUpdateDto = Partial<Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'entradas'>>;

export interface PetFilter {
  search?: string;
  tipo_pet?: string;
  sexo?: string;
  status?: string;
  senioridade?: string;
  porte?: string;
}

export interface TipoPetOption {
  label: string;
  value: string;
  icon?: string;
  faIcon?: string;
}

export const TIPO_PET_OPTIONS: readonly TipoPetOption[] = [
  { label: 'Cachorro', value: 'Cachorro', faIcon: 'fa-solid fa-dog', icon: 'pets' },
  { label: 'Gato', value: 'Gato', faIcon: 'fa-solid fa-cat', icon: 'pets' },
  { label: 'Outro', value: 'Outro', faIcon: 'fa-solid fa-paw', icon: 'pest_control_rodent' },
] as const;

export const SEXO_OPTIONS = [
  { label: 'Macho', value: 'Macho', icon: 'male' },
  { label: 'Fêmea', value: 'Fêmea', icon: 'female' },
] as const;

export const STATUS_OPTIONS = [
  { label: 'Disponível', value: 'Disponível', badgeClass: 'badge-status-disponivel' },
  { label: 'Em Tratamento', value: 'Em Tratamento', badgeClass: 'badge-status-tratamento' },
  { label: 'Quarentena', value: 'Quarentena', badgeClass: 'badge-status-quarentena' },
  { label: 'Adotado', value: 'Adotado', badgeClass: 'badge-status-adotado' },
  { label: 'Óbito', value: 'Óbito', badgeClass: 'badge-status-obito' },
] as const;

export const SENIORIDADE_OPTIONS = [
  { label: 'Filhote', value: 'Filhote' },
  { label: 'Adulto', value: 'Adulto' },
  { label: 'Sênior', value: 'Sênior' },
] as const;

export const PORTE_OPTIONS = [
  { label: 'Mini', value: 'Mini' },
  { label: 'Pequeno', value: 'Pequeno' },
  { label: 'Médio', value: 'Médio' },
  { label: 'Grande', value: 'Grande' },
  { label: 'Gigante', value: 'Gigante' },
] as const;

export type Senioridade = 'Filhote' | 'Adulto' | 'Sênior';

/**
 * Calcula a fase da vida / senioridade do pet a partir da data de nascimento:
 * - Menos de 12 meses: Filhote
 * - De 1 a menos de 7 anos: Adulto
 * - 7 anos ou mais: Sênior
 */
export function calculateSenioridade(birthDateVal: unknown): Senioridade | null {
  if (!birthDateVal) return null;
  let birth: Date | null = null;

  if (birthDateVal instanceof Date && !isNaN(birthDateVal.getTime())) {
    birth = birthDateVal;
  } else if (typeof birthDateVal === 'string' && birthDateVal.trim()) {
    const [year, month, day] = birthDateVal.split('T')[0].split('-').map(Number);
    if (year && month && day) {
      birth = new Date(year, month - 1, day);
    }
  }

  if (!birth) return null;

  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();

  if (today.getDate() < birth.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  if (totalMonths < 12) {
    return 'Filhote';
  }
  if (years < 7) {
    return 'Adulto';
  }
  return 'Sênior';
}

export function getStatusBadgeClass(status?: string | null): string {
  if (!status) return 'badge-status-disponivel';
  const found = STATUS_OPTIONS.find((s) => s.value.toLowerCase() === status.toLowerCase());
  return found?.badgeClass || 'badge-status-disponivel';
}

export function getTipoFaIcon(tipo?: string | null): string {
  if (!tipo) return 'fa-solid fa-paw';
  const found = TIPO_PET_OPTIONS.find((t) => t.value.toLowerCase() === tipo.toLowerCase());
  return found?.faIcon || 'fa-solid fa-paw';
}

export function getTipoBadgeClass(tipo?: string | null): string {
  if (!tipo) return 'bg-dog';
  const t = tipo.trim().toLowerCase();
  if (t === 'gato') return 'bg-cat';
  if (t === 'cachorro') return 'bg-dog';
  return 'bg-other';
}

export function getSexoIcon(sexo?: string | null): string {
  if (!sexo) return 'male';
  const found = SEXO_OPTIONS.find((s) => s.value.toLowerCase() === sexo.toLowerCase());
  return found?.icon || 'male';
}
