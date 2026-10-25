import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { onlyDigits } from '@shared/utils/string-utils';
import { extractErrorMessage } from '@shared/utils/supabase-error.utils';
import {
  DoacaoMonetaria,
  DoacaoMonetariaCreateDto,
  DoacaoMonetariaFilter,
  DoacaoMonetariaUpdateDto,
  formatCurrencyBRL,
} from '../models/doacao-monetaria.model';

@Injectable({
  providedIn: 'root',
})
export class DoacoesMonetariasService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly doacoesMonetariasSignal = signal<DoacaoMonetaria[]>([]);
  public readonly doacoesMonetarias = this.doacoesMonetariasSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  public readonly error = this.errorSignal.asReadonly();

  // Indicadores e KPIs computados
  public readonly totalArrecadado = computed(() =>
    this.doacoesMonetarias().reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0),
  );

  public readonly totalDoacoesCount = computed(() => this.doacoesMonetarias().length);

  public readonly mediaPorDoacao = computed(() => {
    const count = this.totalDoacoesCount();
    return count > 0 ? this.totalArrecadado() / count : 0;
  });

  public readonly maiorDoacao = computed(() => {
    const list = this.doacoesMonetarias();
    if (list.length === 0) return 0;
    return Math.max(...list.map((d) => Number(d.valor) || 0));
  });

  /**
   * Consulta doações monetárias com ordenação cronológica decrescente e filtros.
   */
  async fetchDoacoesMonetarias(filter?: DoacaoMonetariaFilter): Promise<DoacaoMonetaria[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let query = this.supabase.client
        .from('doacoes_monetarias')
        .select('*')
        .order('data_doacao', { ascending: false })
        .order('id', { ascending: false });

      if (filter && filter.searchField && filter.searchValue && filter.searchValue.trim()) {
        const field = filter.searchField;
        const val = filter.searchValue.trim();

        if (field === 'telefone') {
          const digits = onlyDigits(val);
          query = query.ilike('telefone', `%${digits || val}%`);
        } else {
          query = query.ilike('doador', `%${val}%`);
        }
      }

      if (filter?.dataInicio) {
        query = query.gte('data_doacao', filter.dataInicio);
      }
      if (filter?.dataFim) {
        query = query.lte('data_doacao', filter.dataFim);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const rawList = (data as unknown as DoacaoMonetaria[]) || [];
      const normalized: DoacaoMonetaria[] = rawList.map((item) => ({
        ...item,
        valor: Number(item.valor) || 0,
      }));

      this.doacoesMonetariasSignal.set(normalized);
      return normalized;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Erro ao carregar doações em dinheiro.');
      this.errorSignal.set(message);
      this.toast.error(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Registra uma nova doação monetária.
   */
  async createDoacaoMonetaria(dto: DoacaoMonetariaCreateDto): Promise<DoacaoMonetaria | null> {
    this.loadingSignal.set(true);
    try {
      const payload = {
        valor: Number(dto.valor),
        doador: dto.doador.trim(),
        telefone: dto.telefone ? onlyDigits(dto.telefone) || null : null,
        data_doacao: dto.data_doacao || new Date().toISOString().substring(0, 10),
        observacoes: dto.observacoes?.trim() || null,
      };

      const { data, error } = await this.supabase.client
        .from('doacoes_monetarias')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const created = data as unknown as DoacaoMonetaria;
      this.toast.success(
        `Doação de ${formatCurrencyBRL(created.valor)} (${created.doador}) registrada com sucesso!`,
      );
      await this.fetchDoacoesMonetarias();
      return created;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao registrar doação monetária.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Atualiza uma doação monetária cadastrada.
   */
  async updateDoacaoMonetaria(
    id: number,
    dto: DoacaoMonetariaUpdateDto,
  ): Promise<DoacaoMonetaria | null> {
    this.loadingSignal.set(true);
    try {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.valor !== undefined) payload['valor'] = Number(dto.valor);
      if (dto.doador !== undefined) payload['doador'] = dto.doador.trim();
      if (dto.telefone !== undefined) {
        payload['telefone'] = dto.telefone ? onlyDigits(dto.telefone) || null : null;
      }
      if (dto.data_doacao !== undefined) payload['data_doacao'] = dto.data_doacao;
      if (dto.observacoes !== undefined) {
        payload['observacoes'] = dto.observacoes ? dto.observacoes.trim() : null;
      }

      const { data, error } = await this.supabase.client
        .from('doacoes_monetarias')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updated = data as unknown as DoacaoMonetaria;
      this.toast.success(`Doação #${id} atualizada com sucesso!`);
      await this.fetchDoacoesMonetarias();
      return updated;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao atualizar doação monetária.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Exclui uma doação monetária (operação restrita a administradores pelas políticas RLS).
   */
  async deleteDoacaoMonetaria(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client.from('doacoes_monetarias').delete().eq('id', id);

      if (error) {
        throw error;
      }

      this.toast.success(`Doação monetária #${id} excluída com sucesso!`);
      await this.fetchDoacoesMonetarias();
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao excluir doação monetária.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
