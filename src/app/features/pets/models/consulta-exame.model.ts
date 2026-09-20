import { Audit } from '@core/audit/models/audit.model';
import { Veterinario } from '@features/veterinarios/models/veterinario.model';

export interface ConsultaExame extends Audit {
  id?: number;
  id_pet: number;
  id_veterinario?: number | null;
  operacao_medicamento: string;
  data_realizacao: string;
  custo?: number | null;
  tipo_operacao: string;
  veterinario?: Veterinario | null;
}

export interface ConsultaExameCreateDto {
  id_pet: number;
  id_veterinario?: number | null;
  operacao_medicamento: string;
  data_realizacao: string;
  custo?: number | null;
  tipo_operacao: string;
}

export type ConsultaExameUpdateDto = Partial<
  Omit<ConsultaExame, 'id' | 'created_at' | 'updated_at' | 'veterinario'>
>;

export const TIPO_OPERACAO_OPTIONS = [
  'Consulta de Rotina',
  'Consulta Emergencial',
  'Exame de Sangue (Hemograma)',
  'Exame de Imagem (Raio-X / Ultrassom)',
  'Procedimento Cirúrgico',
  'Medicação / Tratamento Contínuo',
  'Outro',
] as const;
