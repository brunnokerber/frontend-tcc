import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@core/auth/services/auth.service';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import {
  ConsultaExame,
  Entrada,
  Pet,
  PetCreateDto,
  PetFilter,
  PetLocal,
  PetUpdateDto,
  Vacina,
} from '../models/pet.model';

@Injectable({
  providedIn: 'root'
})
export class PetsService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  private readonly petsSignal = signal<Pet[]>([]);
  public readonly pets = this.petsSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  public readonly error = this.errorSignal.asReadonly();

  async fetchPets(filter?: PetFilter): Promise<Pet[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let query = this.supabase.client
        .from('pets')
        .select('*, entradas(*)')
        .order('id', { ascending: false });

      if (filter) {
        if (filter.search && filter.search.trim()) {
          const s = `%${filter.search.trim()}%`;
          query = query.or(`nome.ilike.${s},chip.ilike.${s},rga.ilike.${s}`);
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

  async getPetById(id: number): Promise<Pet | null> {
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
      return data as Pet;
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao buscar dados do pet.');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getVacinasByPetId(petId: number): Promise<Vacina[]> {
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
    }
  }

  async getConsultasExamesByPetId(petId: number): Promise<ConsultaExame[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('consultas_exames')
        .select('*, veterinario:id_veterinario(*)')
        .eq('id_pet', petId)
        .order('data_realizacao', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Tabela consultas_exames vazia ou com erro de consulta:', error.message);
        return [];
      }
      return (data as ConsultaExame[]) || [];
    } catch (err: any) {
      console.warn('Erro ao carregar consultas/exames do pet:', err);
      return [];
    }
  }

  async getPetsLocaisByPetId(petId: number): Promise<PetLocal[]> {
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
    }
  }

  async getFullPetDetailsById(id: number): Promise<{
    pet: Pet | null;
    vacinas: Vacina[];
    consultasExames: ConsultaExame[];
    petsLocais: PetLocal[];
  }> {
    this.loadingSignal.set(true);
    try {
      const [pet, vacinas, consultasExames, petsLocais] = await Promise.all([
        this.getPetById(id),
        this.getVacinasByPetId(id),
        this.getConsultasExamesByPetId(id),
        this.getPetsLocaisByPetId(id),
      ]);

      return { pet, vacinas, consultasExames, petsLocais };
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createPet(dto: PetCreateDto): Promise<Pet | null> {
    this.loadingSignal.set(true);
    try {
      const userId = this.authService.getUserId();
      if (!userId) {
        throw new Error('Usuário autenticado não encontrado para registrar a entrada.');
      }

      const { local_origem, data_entrada, resgatante, observacoes, ...petPayload } = dto;

      // 1. Inserir na tabela pets
      const { data: petData, error: petError } = await this.supabase.client
        .from('pets')
        .insert([petPayload])
        .select()
        .single();

      if (petError) {
        throw petError;
      }

      const createdPet = petData as Pet;

      // 2. Inserir na tabela entradas
      const entradaPayload: Omit<Entrada, 'id' | 'created_at' | 'updated_at'> = {
        id_pet: createdPet.id,
        id_usuario: userId,
        local_origem,
        data_entrada,
        resgatante,
        observacoes,
      };

      const { data: entradaData, error: entradaError } = await this.supabase.client
        .from('entradas')
        .insert([entradaPayload])
        .select()
        .single();

      if (entradaError) {
        console.error('Erro ao cadastrar entrada do pet:', entradaError);
        this.toast.warning('Pet cadastrado, mas houve erro ao salvar dados de entrada.');
      } else {
        createdPet.entradas = [entradaData as Entrada];
      }

      this.toast.success(`Pet "${createdPet.nome}" cadastrado com sucesso!`);
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

  async updatePet(id: number, dto: PetUpdateDto): Promise<Pet | null> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('pets')
        .update({
          ...dto,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, entradas(*)')
        .single();

      if (error) {
        throw error;
      }

      const updated = data as Pet;
      this.toast.success(`Pet "${updated.nome}" atualizado com sucesso!`);
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
