import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import {
  Veterinario,
  VeterinarioCreateDto,
  VeterinarioFilter,
  VeterinarioUpdateDto,
} from '../models/veterinario.model';

@Injectable({
  providedIn: 'root',
})
export class VeterinariosService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly veterinariosSignal = signal<Veterinario[]>([]);
  public readonly veterinarios = this.veterinariosSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  public readonly error = this.errorSignal.asReadonly();

  async fetchVeterinarios(filter?: VeterinarioFilter): Promise<Veterinario[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let query = this.supabase.client
        .from('veterinarios')
        .select('*')
        .order('id', { ascending: false });

      if (filter && filter.search && filter.search.trim()) {
        const s = `%${filter.search.trim()}%`;
        query = query.or(`nome.ilike.${s},crvet.ilike.${s},telefone.ilike.${s}`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const list = (data as Veterinario[]) || [];
      this.veterinariosSignal.set(list);
      return list;
    } catch (err: any) {
      const message = err.message || 'Erro ao carregar a lista de veterinários.';
      this.errorSignal.set(message);
      this.toast.error(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getVeterinarioById(id: number): Promise<Veterinario | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('veterinarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as Veterinario;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados do veterinário.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createVeterinario(dto: VeterinarioCreateDto): Promise<Veterinario | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('veterinarios')
        .insert([dto])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const created = data as Veterinario;
      this.toast.success(`Veterinário(a) "${created.nome}" cadastrado(a) com sucesso!`);
      await this.fetchVeterinarios();
      return created;
    } catch (err: any) {
      const msg = err.message || 'Erro ao cadastrar o veterinário.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateVeterinario(id: number, dto: VeterinarioUpdateDto): Promise<Veterinario | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('veterinarios')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updated = data as Veterinario;
      this.toast.success(`Veterinário(a) "${updated.nome}" atualizado(a) com sucesso!`);
      await this.fetchVeterinarios();
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar o veterinário.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
