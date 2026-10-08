import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { onlyDigits } from '@shared/utils/string-utils';
import {
  Voluntario,
  VoluntarioCreateDto,
  VoluntarioFilter,
  VoluntarioUpdateDto,
} from '../models/voluntario.model';

@Injectable({
  providedIn: 'root',
})
export class VoluntariosService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly voluntariosSignal = signal<Voluntario[]>([]);
  public readonly voluntarios = this.veterinariosAsReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  public readonly error = this.errorSignal.asReadonly();

  private veterinariosAsReadonly() {
    return this.voluntariosSignal.asReadonly();
  }

  async fetchVoluntarios(filter?: VoluntarioFilter): Promise<Voluntario[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let query = this.supabase.client
        .from('voluntarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter) {
        if (filter.searchField && filter.searchValue && filter.searchValue.trim()) {
          const field = filter.searchField;
          const val = filter.searchValue.trim();
          if (field === 'telefone') {
            const digits = onlyDigits(val);
            query = query.ilike('telefone', `%${digits || val}%`);
          } else {
            query = query.ilike(field, `%${val}%`);
          }
        }

        if (filter.dia_semana && filter.dia_semana.trim()) {
          query = query.contains('dias_semana', [filter.dia_semana.trim()]);
        }

        if (filter.turno && filter.turno.trim()) {
          query = query.contains('turnos', [filter.turno.trim()]);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const list = (data as Voluntario[]) || [];
      this.voluntariosSignal.set(list);
      return list;
    } catch (err: any) {
      const message = err.message || 'Erro ao carregar a lista de voluntários.';
      this.errorSignal.set(message);
      this.toast.error(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getVoluntarioById(id: number): Promise<Voluntario | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('voluntarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as Voluntario;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados do voluntário.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createVoluntario(dto: VoluntarioCreateDto): Promise<Voluntario | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('voluntarios')
        .insert([dto])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const created = data as Voluntario;
      this.toast.success(`Voluntário(a) "${created.nome}" cadastrado com sucesso!`);
      await this.fetchVoluntarios();
      return created;
    } catch (err: any) {
      const msg = err.message || 'Erro ao cadastrar voluntário.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateVoluntario(id: number, dto: VoluntarioUpdateDto): Promise<Voluntario | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('voluntarios')
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

      const updated = data as Voluntario;
      this.toast.success(`Voluntário(a) "${updated.nome}" atualizado com sucesso!`);
      await this.fetchVoluntarios();
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar dados do voluntário.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async deleteVoluntario(id: number): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client.from('voluntarios').delete().eq('id', id);

      if (error) {
        throw error;
      }

      this.toast.success('Voluntário removido com sucesso!');
      await this.fetchVoluntarios();
      return true;
    } catch (err: any) {
      const msg = err.message || 'Erro ao excluir voluntário.';
      this.toast.error(msg);
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
