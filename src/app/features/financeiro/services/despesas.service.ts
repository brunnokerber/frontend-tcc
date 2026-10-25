import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { extractErrorMessage } from '@shared/utils/supabase-error.utils';
import {
  Despesa,
  DespesaCreateDto,
  DespesaFilter,
  DespesaUpdateDto,
} from '../models/despesa.model';

@Injectable({
  providedIn: 'root',
})
export class DespesasService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  public despesas = signal<Despesa[]>([]);
  public loading = signal<boolean>(false);
  public error = signal<string | null>(null);

  // Cache em memória de despesas associadas a um animal específico
  private readonly cachedPetIdSignal = signal<number | null>(null);
  private readonly petDespesasSignal = signal<Despesa[]>([]);
  public readonly petDespesas = this.petDespesasSignal.asReadonly();

  /**
   * Consulta despesas no Supabase com suporte a filtros dinâmicos
   */
  async fetchDespesas(filter?: DespesaFilter): Promise<Despesa[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      let query = this.supabase.client
        .from('despesas')
        .select('*, pet:id_pet(id, nome, tipo_pet)')
        .order('data_despesa', { ascending: false })
        .order('created_at', { ascending: false });

      if (filter?.categoria) {
        query = query.eq('categoria', filter.categoria);
      }

      if (filter?.dataInicio) {
        query = query.gte('data_despesa', filter.dataInicio);
      }

      if (filter?.dataFim) {
        query = query.lte('data_despesa', filter.dataFim);
      }

      if (filter?.searchTerm && filter.searchTerm.trim() !== '') {
        const term = `%${filter.searchTerm.trim()}%`;
        query = query.or(`descricao.ilike.${term},favorecido.ilike.${term}`);
      }

      if (filter?.id_pet !== undefined && filter?.id_pet !== null) {
        query = query.eq('id_pet', filter.id_pet);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const list = (data as unknown as Despesa[]) || [];
      this.despesas.set(list);
      return list;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao carregar despesas.');
      this.error.set(msg);
      this.toast.error(msg);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Cria nova despesa institucional
   */
  async createDespesa(dto: DespesaCreateDto): Promise<Despesa | null> {
    this.loading.set(true);
    try {
      const payload = {
        descricao: dto.descricao.trim(),
        categoria: dto.categoria,
        valor: Number(dto.valor),
        data_despesa: dto.data_despesa,
        favorecido: dto.favorecido.trim(),
        telefone: dto.telefone ? dto.telefone.replace(/\D/g, '') : null,
        observacoes: dto.observacoes?.trim() || null,
        id_pet: dto.id_pet || null,
      };

      const { data, error } = await this.supabase.client
        .from('despesas')
        .insert(payload)
        .select('*, pet:id_pet(id, nome, tipo_pet)')
        .single();

      if (error) {
        throw error;
      }

      const nova = data as unknown as Despesa;
      this.despesas.update((lista) => [nova, ...lista]);
      if (this.cachedPetIdSignal() === nova.id_pet) {
        this.petDespesasSignal.update((lista) => [nova, ...lista]);
      }
      this.toast.success('Despesa registrada com sucesso!');
      return nova;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Falha ao registrar despesa.');
      this.toast.error(msg);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Atualiza despesa existente
   */
  async updateDespesa(id: number, dto: DespesaUpdateDto): Promise<Despesa | null> {
    this.loading.set(true);
    try {
      const payload: Record<string, unknown> = {};

      if (dto.descricao !== undefined) payload['descricao'] = dto.descricao.trim();
      if (dto.categoria !== undefined) payload['categoria'] = dto.categoria;
      if (dto.valor !== undefined) payload['valor'] = Number(dto.valor);
      if (dto.data_despesa !== undefined) payload['data_despesa'] = dto.data_despesa;
      if (dto.favorecido !== undefined) payload['favorecido'] = dto.favorecido.trim();
      if (dto.telefone !== undefined) {
        payload['telefone'] = dto.telefone ? dto.telefone.replace(/\D/g, '') : null;
      }
      if (dto.observacoes !== undefined) {
        payload['observacoes'] = dto.observacoes ? dto.observacoes.trim() : null;
      }
      if (dto.id_pet !== undefined) payload['id_pet'] = dto.id_pet || null;

      const { data, error } = await this.supabase.client
        .from('despesas')
        .update(payload)
        .eq('id', id)
        .select('*, pet:id_pet(id, nome, tipo_pet)')
        .single();

      if (error) {
        throw error;
      }

      const atualizada = data as unknown as Despesa;
      this.despesas.update((lista) => lista.map((d) => (d.id === id ? atualizada : d)));
      if (this.cachedPetIdSignal()) {
        const petId = this.cachedPetIdSignal();
        this.petDespesasSignal.update((lista) => {
          if (atualizada.id_pet === petId) {
            const exists = lista.some((d) => d.id === id);
            return exists
              ? lista.map((d) => (d.id === id ? atualizada : d))
              : [atualizada, ...lista];
          } else {
            return lista.filter((d) => d.id !== id);
          }
        });
      }
      this.toast.success('Despesa atualizada com sucesso!');
      return atualizada;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Falha ao atualizar despesa.');
      this.toast.error(msg);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Exclusão física de despesa (restrita a administradores via RLS)
   */
  async deleteDespesa(id: number): Promise<boolean> {
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client.from('despesas').delete().eq('id', id);

      if (error) {
        throw error;
      }

      this.despesas.update((lista) => lista.filter((d) => d.id !== id));
      if (this.cachedPetIdSignal()) {
        this.petDespesasSignal.update((lista) => lista.filter((d) => d.id !== id));
      }
      this.toast.success('Despesa excluída com sucesso!');
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        'Falha ao excluir despesa. Certifique-se de possuir privilégios de administrador.',
      );
      this.toast.error(msg);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Consulta todas as despesas institucionais vinculadas a um animal específico com cache
   */
  async getDespesasByPetId(petId: number, forceRefresh = false): Promise<Despesa[]> {
    if (!forceRefresh && this.cachedPetIdSignal() === petId) {
      return this.petDespesasSignal();
    }

    try {
      const { data, error } = await this.supabase.client
        .from('despesas')
        .select('*, pet:id_pet(id, nome, tipo_pet)')
        .eq('id_pet', petId)
        .order('data_despesa', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const list = (data as unknown as Despesa[]) || [];
      this.petDespesasSignal.set(list);
      this.cachedPetIdSignal.set(petId);
      return list;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao carregar despesas vinculadas ao animal.');
      this.toast.error(msg);
      return [];
    }
  }
}
