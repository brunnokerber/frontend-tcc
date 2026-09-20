import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import {
  ConsultaExame,
  ConsultaExameCreateDto,
  ConsultaExameUpdateDto,
} from '../models/consulta-exame.model';

@Injectable({
  providedIn: 'root',
})
export class ConsultasExamesService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  async getConsultasExamesByPetId(petId: number): Promise<ConsultaExame[]> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('consultas_exames')
        .select('*, veterinario:id_veterinario(*)')
        .eq('id_pet', petId)
        .order('data_realizacao', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Tabela consultas_exames vazia ou com erro de consulta:', error.message);
        return [];
      }
      return (data as ConsultaExame[]) || [];
    } catch (err: any) {
      console.warn('Erro ao carregar consultas/exames do pet:', err);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getConsultaExameById(id: number): Promise<ConsultaExame | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('consultas_exames')
        .select('*, veterinario:id_veterinario(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as ConsultaExame;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados do procedimento/consulta.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createConsultaExame(dto: ConsultaExameCreateDto): Promise<ConsultaExame | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('consultas_exames')
        .insert([dto])
        .select('*, veterinario:id_veterinario(*)')
        .single();

      if (error) {
        throw error;
      }

      const created = data as ConsultaExame;
      this.toast.success(`Procedimento "${created.operacao_medicamento}" registrado com sucesso!`);
      return created;
    } catch (err: any) {
      const msg = err.message || 'Erro ao registrar procedimento/consulta.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateConsultaExame(
    id: number,
    dto: ConsultaExameUpdateDto
  ): Promise<ConsultaExame | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('consultas_exames')
        .update({
          ...dto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, veterinario:id_veterinario(*)')
        .single();

      if (error) {
        throw error;
      }

      const updated = data as ConsultaExame;
      this.toast.success(`Procedimento "${updated.operacao_medicamento}" atualizado com sucesso!`);
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar procedimento/consulta.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
