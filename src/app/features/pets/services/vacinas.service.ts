import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { Vacina, VacinaCreateDto, VacinaUpdateDto } from '../models/vacina.model';

@Injectable({
  providedIn: 'root',
})
export class VacinasService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  async getVacinasByPetId(petId: number): Promise<Vacina[]> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('vacinas')
        .select('*, veterinario:id_veterinario(*)')
        .eq('id_pet', petId)
        .order('data_aplicacao', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Tabela vacinas vazia ou com erro de consulta:', error.message);
        return [];
      }
      return (data as Vacina[]) || [];
    } catch (err: any) {
      console.warn('Erro ao carregar vacinas do pet:', err);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getVacinaById(id: number): Promise<Vacina | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('vacinas')
        .select('*, veterinario:id_veterinario(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as Vacina;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados da vacina.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createVacina(dto: VacinaCreateDto): Promise<Vacina | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('vacinas')
        .insert([dto])
        .select('*, veterinario:id_veterinario(*)')
        .single();

      if (error) {
        throw error;
      }

      const created = data as Vacina;
      this.toast.success(`Vacina "${created.nome_vacina}" registrada com sucesso!`);
      return created;
    } catch (err: any) {
      const msg = err.message || 'Erro ao registrar a vacina.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateVacina(id: number, dto: VacinaUpdateDto): Promise<Vacina | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('vacinas')
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

      const updated = data as Vacina;
      this.toast.success(`Vacina "${updated.nome_vacina}" atualizada com sucesso!`);
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar a vacina.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
