import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { onlyDigits } from '@shared/utils/string-utils';
import {
  Local,
  LocalCreateDto,
  LocalFilter,
  LocalUpdateDto,
} from '../models/local.model';

@Injectable({
  providedIn: 'root',
})
export class LocaisService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly locaisSignal = signal<Local[]>([]);
  public readonly locais = this.locaisSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  public readonly error = this.errorSignal.asReadonly();

  async fetchLocais(filter?: LocalFilter): Promise<Local[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let query = this.supabase.client
        .from('locais')
        .select('*')
        .order('id', { ascending: false });

      if (filter && filter.searchField && filter.searchValue && filter.searchValue.trim()) {
        const field = filter.searchField;
        const val = filter.searchValue.trim();
        if (field === 'tipo_local') {
          query = query.eq('tipo_local', val);
        } else if (field === 'telefone') {
          const digits = onlyDigits(val);
          query = query.ilike('telefone', `%${digits || val}%`);
        } else {
          query = query.ilike(field, `%${val}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const list = (data as Local[]) || [];
      this.locaisSignal.set(list);
      return list;
    } catch (err: any) {
      const message = err.message || 'Erro ao carregar a lista de locais.';
      this.errorSignal.set(message);
      this.toast.error(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getLocalById(id: number): Promise<Local | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('locais')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as Local;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados do local.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createLocal(dto: LocalCreateDto): Promise<Local | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('locais')
        .insert([dto])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const created = data as Local;
      this.toast.success(`Local "${created.local}" cadastrado com sucesso!`);
      await this.fetchLocais();
      return created;
    } catch (err: any) {
      const msg = err.message || 'Erro ao cadastrar o local.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateLocal(id: number, dto: LocalUpdateDto): Promise<Local | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('locais')
        .update({
          ...dto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updated = data as Local;
      this.toast.success(`Local "${updated.local}" atualizado com sucesso!`);
      await this.fetchLocais();
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar o local.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Consulta o CEP no serviço ViaCEP para autopreenchimento de endereço.
   */
  async fetchAddressByCep(
    cep: string
  ): Promise<{ rua?: string; bairro?: string; cidade?: string; estado?: string } | null> {
    const cleanCep = onlyDigits(cep);
    if (cleanCep.length !== 8) {
      return null;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) return null;
      const data = await response.json();
      if (data.erro) return null;

      return {
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      };
    } catch {
      return null;
    }
  }
}
