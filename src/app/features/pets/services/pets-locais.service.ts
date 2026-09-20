import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { PetLocal, PetLocalCreateDto, PetLocalUpdateDto } from '../models/pet-local.model';

@Injectable({
  providedIn: 'root',
})
export class PetsLocaisService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  async getPetsLocaisByPetId(petId: number): Promise<PetLocal[]> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('pets_locais')
        .select('*, locais:id_local(*)')
        .eq('id_pet', petId)
        .order('data_saida', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Tabela pets_locais vazia ou com erro de consulta:', error.message);
        return [];
      }
      return (data as PetLocal[]) || [];
    } catch (err: any) {
      console.warn('Erro ao carregar histórico de locais do pet:', err);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getPetLocalById(id: number): Promise<PetLocal | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('pets_locais')
        .select('*, locais:id_local(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as PetLocal;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados do local de passagem.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createPetLocal(dto: PetLocalCreateDto): Promise<PetLocal | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('pets_locais')
        .insert([dto])
        .select('*, locais:id_local(*)')
        .single();

      if (error) {
        throw error;
      }

      const created = data as PetLocal;
      this.toast.success('Local de passagem registrado com sucesso!');
      return created;
    } catch (err: any) {
      const msg = err.message || 'Erro ao registrar local de passagem.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updatePetLocal(id: number, dto: PetLocalUpdateDto): Promise<PetLocal | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('pets_locais')
        .update({
          ...dto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, locais:id_local(*)')
        .single();

      if (error) {
        throw error;
      }

      const updated = data as PetLocal;
      this.toast.success('Local de passagem atualizado com sucesso!');
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar local de passagem.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
