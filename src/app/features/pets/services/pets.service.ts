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
import { compressAndResizeImage } from '@shared/utils/image-utils';

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar a lista de pets.';
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados do pet.';
      this.toast.error(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  setCachedPet(pet: Pet | null): void {
    this.cachedPetSignal.set(pet);
  }

  /**
   * Faz o upload da foto do pet para o bucket privado 'pets' no Supabase Storage.
   * Valida tamanho máximo de 256 KB (262.144 bytes) e formatos aceitos: JPEG, PNG e WebP.
   * Retorna o caminho relativo (ex: 'avatars/uuid.webp').
   */
  async uploadPetFoto(file: File, petId?: number): Promise<string> {
    const MAX_SIZE = 256 * 1024; // 256 KB (262.144 bytes)

    // Se o arquivo exceder o limite, realiza compressão e redimensionamento automático no cliente
    if (file.size > MAX_SIZE) {
      try {
        file = await compressAndResizeImage(file, {
          maxSizeBytes: MAX_SIZE,
          maxWidth: 800,
          maxHeight: 800,
        });
      } catch (err: unknown) {
        console.warn('Tentativa de compressão automática de imagem falhou:', err);
      }
    }

    if (file.size > MAX_SIZE) {
      const msg = 'A imagem excede o limite de 256 KB mesmo após tentativa de compressão.';
      this.toast.error(msg);
      throw new Error(msg);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const msg = 'Formato de imagem inválido. Formatos aceitos: JPEG, PNG e WebP.';
      this.toast.error(msg);
      throw new Error(msg);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString();
    const fileName = `${petId || uniqueId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error } = await this.supabase.client.storage
      .from('pets')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error('Erro ao subir imagem para o storage:', error);
      const msg = error.message || 'Erro ao realizar upload da foto do pet.';
      this.toast.error(msg);
      throw error;
    }

    return filePath;
  }

  /**
   * Gera uma URL assinada temporária (válida por 1 hora por padrão) para visualização
   * de fotos no bucket privado 'pets' do Supabase Storage.
   */
  async getSignedFotoUrl(
    caminhoFoto: string | null | undefined,
    expiresIn = 3600
  ): Promise<string | null> {
    if (!caminhoFoto || !caminhoFoto.trim()) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.client.storage
        .from('pets')
        .createSignedUrl(caminhoFoto.trim(), expiresIn);

      if (error || !data?.signedUrl) {
        console.error('Erro ao gerar URL assinada da foto:', error);
        return null;
      }

      return data.signedUrl;
    } catch (err: unknown) {
      console.error('Exceção ao gerar URL assinada da foto:', err);
      return null;
    }
  }

  /**
   * Remove uma foto do bucket privado 'pets' no Supabase Storage.
   */
  async deletePetFoto(caminhoFoto: string | null | undefined): Promise<void> {
    if (!caminhoFoto || !caminhoFoto.trim()) {
      return;
    }
    try {
      await this.supabase.client.storage.from('pets').remove([caminhoFoto.trim()]);
    } catch (err: unknown) {
      console.warn('Não foi possível remover a foto antiga do storage:', err);
    }
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

      const rpcResult = data as { pet_id?: number } | number | null;
      const petId =
        typeof rpcResult === 'object' && rpcResult !== null
          ? rpcResult.pet_id
          : typeof rpcResult === 'number'
            ? rpcResult
            : null;
      const createdPet = petId ? await this.getPetById(petId, true) : null;

      this.toast.success(`Pet "${dto.nome}" cadastrado com sucesso!`);
      await this.fetchPets();
      return createdPet;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar o pet.';
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

      // Força a recarga para atualizar o cachedPetSignal com a nova foto e dados do pet
      const updated = await this.getPetById(id, true);
      if (updated) {
        this.cachedPetSignal.set(updated);
      }
      this.toast.success(`Pet "${dto.nome || updated?.nome}" atualizado com sucesso!`);
      await this.fetchPets();
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar o pet.';
      this.toast.error(msg);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
