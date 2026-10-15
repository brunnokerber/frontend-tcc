import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import {
  Vacina,
  VacinaCalendarioFiltro,
  VacinaCalendarioItem,
  VacinaCreateDto,
  VacinaUpdateDto,
} from '../models/vacina.model';
import { getTodayIso } from '@shared/utils/string-utils';

@Injectable({
  providedIn: 'root',
})
export class VacinasService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly cachedPetIdSignal = signal<number | null>(null);
  private readonly vacinasSignal = signal<Vacina[]>([]);
  public readonly vacinas = this.vacinasSignal.asReadonly();

  async getVacinasByPetId(petId: number, forceRefresh = false): Promise<Vacina[]> {
    if (!forceRefresh && this.cachedPetIdSignal() === petId) {
      return this.vacinasSignal();
    }

    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('vacinas')
        .select('*, veterinario:id_veterinario(*)')
        .eq('id_pet', petId)
        .order('data_aplicacao', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Tabela vacinas vazia ou com erro de consulta:', error.message);
        this.vacinasSignal.set([]);
        this.cachedPetIdSignal.set(petId);
        return [];
      }
      const list = (data as Vacina[]) || [];
      this.vacinasSignal.set(list);
      this.cachedPetIdSignal.set(petId);
      return list;
    } catch (err: any) {
      console.warn('Erro ao carregar vacinas do pet:', err);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getVacinaById(id: number): Promise<Vacina | null> {
    const cached = this.vacinasSignal().find((v) => v.id === id);
    if (cached) {
      return cached;
    }

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
      if (this.cachedPetIdSignal() === dto.id_pet) {
        this.vacinasSignal.update((list) => [created, ...list]);
      }
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
      this.vacinasSignal.update((list) => list.map((v) => (v.id === id ? updated : v)));
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar a vacina.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Consulta vacinas para o Calendário Vacinal com dados do pet e veterinário.
   */
  async getVacinasCalendario(filtro?: VacinaCalendarioFiltro): Promise<VacinaCalendarioItem[]> {
    this.loadingSignal.set(true);
    try {
      let query = this.supabase.client
        .from('vacinas')
        .select('*, pet:id_pet(id, nome, foto_url, tipo_pet, porte, status), veterinario:id_veterinario(*)');

      if (filtro?.petId) {
        query = query.eq('id_pet', filtro.petId);
      }

      if (filtro?.startDate) {
        query = query.gte('data_prevista', filtro.startDate);
      }

      if (filtro?.endDate) {
        query = query.lte('data_prevista', filtro.endDate);
      }

      if (filtro?.status === 'previstas') {
        query = query.is('data_aplicacao', null);
      } else if (filtro?.status === 'aplicadas') {
        query = query.not('data_aplicacao', 'is', null);
      }

      query = query.order('data_prevista', { ascending: true });

      const { data, error } = await query;
      if (error) {
        console.warn('Erro ao carregar calendário de vacinas:', error.message);
        return [];
      }

      return (data as VacinaCalendarioItem[]) || [];
    } catch (err: unknown) {
      console.warn('Erro ao carregar calendário de vacinas:', err);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Registro rápido de aplicação de vacina prevista
   */
  async aplicarVacinaRapida(
    id: number,
    dataAplicacao?: string,
    idVeterinario?: number | null,
    custo?: number | null
  ): Promise<Vacina | null> {
    const updatePayload: VacinaUpdateDto = {
      data_aplicacao: dataAplicacao || getTodayIso(),
    };
    if (idVeterinario !== undefined) updatePayload.id_veterinario = idVeterinario;
    if (custo !== undefined) updatePayload.custo = custo;

    return this.updateVacina(id, updatePayload);
  }

  /**
   * Remove um agendamento ou registro de vacina
   */
  async deleteVacina(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client
        .from('vacinas')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      this.toast.success('Vacina removida com sucesso!');
      this.vacinasSignal.update((list) => list.filter((v) => v.id !== id));
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover a vacina.';
      this.toast.error(msg);
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  clearCache(): void {
    this.cachedPetIdSignal.set(null);
    this.vacinasSignal.set([]);
  }
}

