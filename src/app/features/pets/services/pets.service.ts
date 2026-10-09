import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import {
  Entrada,
  EntradaUpdateDto,
  Pet,
  PetCreateDto,
  PetFilter,
  PetUpdateDto,
} from '../models/pet.model';

@Injectable({
  providedIn: 'root',
})
export class PetsService {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  private readonly petsSignal = signal<Pet[]>([]);
  public readonly pets = this.petsSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  public readonly error = this.errorSignal.asReadonly();

  private readonly cachedPetSignal = signal<Pet | null>(null);
  public readonly cachedPet = this.cachedPetSignal.asReadonly();

  async fetchPets(filter?: PetFilter): Promise<Pet[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let query = this.supabase.client
        .from('pets')
        .select('*, entradas(*)')
        .order('id', { ascending: false });

      if (filter) {
        if (filter.searchValue && filter.searchValue.trim()) {
          const field = filter.searchField || 'nome';
          query = query.ilike(field, `%${filter.searchValue.trim()}%`);
        } else if (filter.search && filter.search.trim()) {
          query = query.ilike('nome', `%${filter.search.trim()}%`);
        }
        if (filter.tipo_pet) {
          query = query.eq('tipo_pet', filter.tipo_pet);
        }
        if (filter.sexo) {
          query = query.eq('sexo', filter.sexo);
        }
        if (filter.status) {
          query = query.eq('status', filter.status);
        }
        if (filter.senioridade) {
          query = query.eq('senioridade', filter.senioridade);
        }
        if (filter.porte) {
          query = query.eq('porte', filter.porte);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const list = (data as Pet[]) || [];
      this.petsSignal.set(list);
      return list;
    } catch (err: any) {
      const message = err.message || 'Erro ao carregar a lista de pets.';
      this.errorSignal.set(message);
      this.toast.error(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getPetById(id: number, forceRefresh = false): Promise<Pet | null> {
    if (!forceRefresh && this.cachedPetSignal()?.id === id) {
      return this.cachedPetSignal();
    }

    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('pets')
        .select('*, entradas(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      const pet = data as Pet;
      this.cachedPetSignal.set(pet);
      return pet;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados do pet.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  setCachedPet(pet: Pet | null): void {
    this.cachedPetSignal.set(pet);
  }

  async createPet(dto: PetCreateDto): Promise<Pet | null> {
    this.loadingSignal.set(true);
    try {
      const { local_origem, data_entrada, resgatante, observacoes, ...petPayload } = dto;
      const entradaPayload = {
        local_origem,
        data_entrada,
        resgatante,
        observacoes,
      };

      // Chamada atômica à stored procedure (RPC) no PostgreSQL
      const { data, error } = await this.supabase.client.rpc('create_pet_com_entrada', {
        p_pet_data: petPayload,
        p_entrada_data: entradaPayload,
      });

      if (error) {
        throw error;
      }

      const petId = (data as any)?.pet_id || (typeof data === 'number' ? data : null);
      const createdPet = petId ? await this.getPetById(petId) : null;

      this.toast.success(`Pet "${dto.nome}" cadastrado com sucesso!`);
      await this.fetchPets();
      return createdPet;
    } catch (err: any) {
      const msg = err.message || 'Erro ao cadastrar o pet.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updatePet(
    id: number,
    dto: PetUpdateDto,
    entradaDto?: EntradaUpdateDto,
    _entradaId?: number
  ): Promise<Pet | null> {
    this.loadingSignal.set(true);
    try {
      // Chamada atômica à stored procedure (RPC) no PostgreSQL
      const { error } = await this.supabase.client.rpc('update_pet_com_entrada', {
        p_pet_id: id,
        p_pet_data: dto,
        p_entrada_data: entradaDto || null,
      });

      if (error) {
        throw error;
      }

      const updated = await this.getPetById(id);
      this.toast.success(`Pet "${dto.nome || updated?.nome}" atualizado com sucesso!`);
      await this.fetchPets();
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Erro ao atualizar o pet.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
