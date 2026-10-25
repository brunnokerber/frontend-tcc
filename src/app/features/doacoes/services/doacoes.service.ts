import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { onlyDigits } from '@shared/utils/string-utils';
import { extractErrorMessage } from '@shared/utils/supabase-error.utils';
import {
  calcularSaldoDisponivel,
  calcularVolumeDirecionado,
  DirecionamentoCreateDto,
  DirecionamentoDoacao,
  DirecionamentoFilter,
  DirecionamentoUpdateDto,
  Doacao,
  DoacaoCreateDto,
  DoacaoFilter,
  DoacaoUpdateDto,
  enriquecerDoacao,
  LocalResumido,
} from '../models/doacao.model';

interface SupabaseDoacaoRaw extends Doacao {
  direcionamento_doacoes?: (DirecionamentoDoacao & {
    locais?: LocalResumido | null;
  })[];
}

interface SupabaseDirecionamentoRaw extends DirecionamentoDoacao {
  locais?: LocalResumido | null;
  doacoes?: {
    id: number;
    tipo_doacao?: string;
    doador: string;
    volume: number;
    unidade_medida: string;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class DoacoesService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly doacoesSignal = signal<Doacao[]>([]);
  public readonly doacoes = this.doacoesSignal.asReadonly();

  private readonly direcionamentosSignal = signal<DirecionamentoDoacao[]>([]);
  public readonly direcionamentos = this.direcionamentosSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  public readonly error = this.errorSignal.asReadonly();

  /**
   * Busca todas as doações com os direcionamentos e locais relacionados,
   * calculando reativamente saldos e status.
   */
  async fetchDoacoes(filter?: DoacaoFilter): Promise<Doacao[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let query = this.supabase.client
        .from('doacoes')
        .select(
          `
          id,
          tipo_doacao,
          volume,
          doador,
          telefone,
          unidade_medida,
          created_at,
          updated_at,
          direcionamento_doacoes (
            id,
            id_local,
            id_doacao,
            volume,
            created_at,
            updated_at,
            locais (
              id,
              local,
              tipo_local,
              contato,
              telefone,
              cidade
            )
          )
        `,
        )
        .order('id', { ascending: false });

      if (filter && filter.searchField && filter.searchValue && filter.searchValue.trim()) {
        const field = filter.searchField;
        const val = filter.searchValue.trim();

        if (field === 'telefone') {
          const digits = onlyDigits(val);
          query = query.ilike('telefone', `%${digits || val}%`);
        } else if (field === 'unidade_medida') {
          query = query.ilike('unidade_medida', `%${val}%`);
        } else if (field === 'tipo_doacao') {
          query = query.ilike('tipo_doacao', `%${val}%`);
        } else {
          query = query.ilike('doador', `%${val}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const rawList = (data as unknown as SupabaseDoacaoRaw[]) || [];

      let enrichedList: Doacao[] = rawList.map((item) => {
        const rawDirecionamentos = item.direcionamento_doacoes || [];
        const mappedDirecionamentos: DirecionamentoDoacao[] = rawDirecionamentos.map((d) => ({
          id: d.id,
          id_local: d.id_local,
          id_doacao: d.id_doacao,
          volume: Number(d.volume) || 0,
          created_at: d.created_at,
          updated_at: d.updated_at,
          local: d.locais ? { ...d.locais } : undefined,
        }));

        return enriquecerDoacao(item, mappedDirecionamentos);
      });

      if (filter?.status && filter.status !== 'todos') {
        enrichedList = enrichedList.filter((d) => d.status === filter.status);
      }

      this.doacoesSignal.set(enrichedList);
      return enrichedList;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Erro ao carregar a lista de doações.');
      this.errorSignal.set(message);
      this.toast.error(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Busca a lista consolidada de direcionamentos com os dados de locais e doações.
   */
  async fetchDirecionamentos(filter?: DirecionamentoFilter): Promise<DirecionamentoDoacao[]> {
    try {
      let query = this.supabase.client
        .from('direcionamento_doacoes')
        .select(
          `
          id,
          id_local,
          id_doacao,
          volume,
          created_at,
          updated_at,
          locais (
            id,
            local,
            tipo_local,
            contato,
            telefone,
            cidade
          ),
          doacoes (
            id,
            tipo_doacao,
            doador,
            volume,
            unidade_medida
          )
        `,
        )
        .order('id', { ascending: false });

      if (filter?.id_local) {
        query = query.eq('id_local', filter.id_local);
      }
      if (filter?.id_doacao) {
        query = query.eq('id_doacao', filter.id_doacao);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      const rawList = (data as unknown as SupabaseDirecionamentoRaw[]) || [];
      const list: DirecionamentoDoacao[] = rawList.map((d) => ({
        id: d.id,
        id_local: d.id_local,
        id_doacao: d.id_doacao,
        volume: Number(d.volume) || 0,
        created_at: d.created_at,
        updated_at: d.updated_at,
        local: d.locais ? { ...d.locais } : undefined,
        doacao: d.doacoes ? (d.doacoes as unknown as Doacao) : undefined,
      }));

      this.direcionamentosSignal.set(list);
      return list;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Erro ao carregar os direcionamentos de doações.');
      this.toast.error(message);
      return [];
    }
  }

  /**
   * Registra uma nova doação no sistema.
   */
  async createDoacao(dto: DoacaoCreateDto): Promise<Doacao | null> {
    this.loadingSignal.set(true);
    try {
      const payload = {
        tipo_doacao: (dto.tipo_doacao || '').trim(),
        volume: Number(dto.volume),
        doador: (dto.doador || '').trim(),
        telefone: dto.telefone ? onlyDigits(dto.telefone) || null : null,
        unidade_medida: (dto.unidade_medida || 'kg').trim(),
      };

      const { data, error } = await this.supabase.client
        .from('doacoes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const created = data as unknown as Doacao;
      this.toast.success(
        `Doação de ${created.volume} ${created.unidade_medida} de ${created.tipo_doacao} (${created.doador}) registrada com sucesso!`,
      );
      await this.fetchDoacoes();
      return created;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao registrar nova doação.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Atualiza uma doação cadastrada, verificando se o novo volume cobre o volume já direcionado.
   */
  async updateDoacao(id: number, dto: DoacaoUpdateDto): Promise<Doacao | null> {
    this.loadingSignal.set(true);
    try {
      // Validação de consistência se o volume foi alterado
      if (dto.volume !== undefined) {
        const current = this.doacoes().find((d) => d.id === id);
        const volumeDirecionado = current?.volume_direcionado ?? 0;
        if (Number(dto.volume) < volumeDirecionado) {
          throw new Error(
            `O novo volume total (${dto.volume}) não pode ser menor que o volume já direcionado para locais (${volumeDirecionado}). Remova ou ajuste os direcionamentos antes de diminuir o volume total.`,
          );
        }
      }

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.tipo_doacao !== undefined) payload['tipo_doacao'] = dto.tipo_doacao.trim();
      if (dto.volume !== undefined) payload['volume'] = Number(dto.volume);
      if (dto.doador !== undefined) payload['doador'] = dto.doador.trim();
      if (dto.telefone !== undefined) {
        payload['telefone'] = dto.telefone ? onlyDigits(dto.telefone) || null : null;
      }
      if (dto.unidade_medida !== undefined) payload['unidade_medida'] = dto.unidade_medida.trim();

      const { data, error } = await this.supabase.client
        .from('doacoes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updated = data as unknown as Doacao;
      this.toast.success(`Doação #${id} atualizada com sucesso!`);
      await this.fetchDoacoes();
      return updated;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao atualizar a doação.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Exclui uma doação e seus respectivos direcionamentos (via ON DELETE CASCADE).
   */
  async deleteDoacao(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client.from('doacoes').delete().eq('id', id);

      if (error) {
        throw error;
      }

      this.toast.success(`Doação #${id} removida com sucesso!`);
      await this.fetchDoacoes();
      await this.fetchDirecionamentos();
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao excluir a doação.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Registra um direcionamento de volume para um local a partir de uma doação.
   */
  async createDirecionamento(dto: DirecionamentoCreateDto): Promise<DirecionamentoDoacao | null> {
    this.loadingSignal.set(true);
    try {
      const doacao = this.doacoes().find((d) => d.id === dto.id_doacao);
      const volumeSolicitado = Number(dto.volume);

      if (doacao) {
        const saldoDisponivel = doacao.volume_disponivel ?? 0;
        if (volumeSolicitado > saldoDisponivel) {
          throw new Error(
            `Volume solicitado (${volumeSolicitado} ${doacao.unidade_medida}) excede o saldo restante disponível (${saldoDisponivel} ${doacao.unidade_medida}).`,
          );
        }
      }

      const payload = {
        id_doacao: dto.id_doacao,
        id_local: dto.id_local,
        volume: volumeSolicitado,
      };

      const { data, error } = await this.supabase.client
        .from('direcionamento_doacoes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.toast.success('Direcionamento de insumos registrado com sucesso!');
      await this.fetchDoacoes();
      await this.fetchDirecionamentos();
      return data as unknown as DirecionamentoDoacao;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao registrar direcionamento.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Atualiza o direcionamento de uma doação para um local.
   */
  async updateDirecionamento(
    id: number,
    id_doacao: number,
    dto: DirecionamentoUpdateDto,
  ): Promise<DirecionamentoDoacao | null> {
    this.loadingSignal.set(true);
    try {
      const doacao = this.doacoes().find((d) => d.id === id_doacao);
      if (doacao && dto.volume !== undefined) {
        const outrosDirecionamentos = (doacao.direcionamentos || []).filter((d) => d.id !== id);
        const volumeOutros = calcularVolumeDirecionado(outrosDirecionamentos);
        const novoVolume = Number(dto.volume);
        const saldoParaEste = calcularSaldoDisponivel(doacao.volume, volumeOutros);

        if (novoVolume > saldoParaEste) {
          throw new Error(
            `O volume informado (${novoVolume}) ultrapassa o limite máximo disponível para esta doação (${saldoParaEste} ${doacao.unidade_medida}).`,
          );
        }
      }

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (dto.id_local !== undefined) payload['id_local'] = dto.id_local;
      if (dto.volume !== undefined) payload['volume'] = Number(dto.volume);

      const { data, error } = await this.supabase.client
        .from('direcionamento_doacoes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.toast.success('Direcionamento atualizado com sucesso!');
      await this.fetchDoacoes();
      await this.fetchDirecionamentos();
      return data as unknown as DirecionamentoDoacao;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao atualizar direcionamento.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Exclui um direcionamento e devolve o volume correspondente ao saldo disponível da doação.
   */
  async deleteDirecionamento(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client
        .from('direcionamento_doacoes')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      this.toast.success('Direcionamento removido! O volume foi restituído ao saldo da doação.');
      await this.fetchDoacoes();
      await this.fetchDirecionamentos();
      return true;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Erro ao excluir direcionamento.');
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
