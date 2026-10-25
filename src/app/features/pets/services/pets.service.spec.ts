import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pet, PetCreateDto, PetFilter, PetUpdateDto } from '../models/pet.model';
import { AdotarPetDto } from '../models/pet-local.model';
import { PetsService } from './pets.service';

describe('PetsService (Gestão de Pets e Entradas)', () => {
  let service: PetsService;
  let supabaseMock: any;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const mockPets: Pet[] = [
    {
      id: 1,
      nome: 'Rex',
      tipo_pet: 'Cachorro',
      sexo: 'Macho',
      status: 'Disponível',
      porte: 'Médio',
      senioridade: 'Adulto',
      castrado: true,
      vacinado: true,
      foto_url: 'avatars/rex.jpg',
    },
    {
      id: 2,
      nome: 'Mimi',
      tipo_pet: 'Gato',
      sexo: 'Fêmea',
      status: 'Disponível',
      porte: 'Pequeno',
      senioridade: 'Filhote',
      castrado: false,
      vacinado: false,
      foto_url: null,
    },
  ];

  beforeEach(() => {
    supabaseMock = {
      client: {
        from: vi.fn(),
        rpc: vi.fn(),
        storage: {
          from: vi.fn(),
        },
      },
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PetsService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    service = TestBed.inject(PetsService);
  });

  describe('fetchPets', () => {
    it('deve listar pets com sucesso e atualizar o signal pets', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPets, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchPets();

      expect(supabaseMock.client.from).toHaveBeenCalledWith('pets');
      expect(queryBuilder.select).toHaveBeenCalledWith('*, entradas(*)');
      expect(result).toEqual(mockPets);
      expect(service.pets()).toEqual(mockPets);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('deve aplicar filtros dinâmicos na busca (ilike, eq)', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // O await no queryBuilder resolverá os dados
      queryBuilder.then = (resolve: any) => resolve({ data: [mockPets[0]], error: null });
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const filter: PetFilter = {
        searchValue: 'Rex',
        searchField: 'nome',
        tipo_pet: 'Cachorro',
        sexo: 'Macho',
        status: 'Disponível',
        senioridade: 'Adulto',
        porte: 'Médio',
      };

      const result = await service.fetchPets(filter);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('nome', '%Rex%');
      expect(queryBuilder.eq).toHaveBeenCalledWith('tipo_pet', 'Cachorro');
      expect(queryBuilder.eq).toHaveBeenCalledWith('sexo', 'Macho');
      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'Disponível');
      expect(queryBuilder.eq).toHaveBeenCalledWith('senioridade', 'Adulto');
      expect(queryBuilder.eq).toHaveBeenCalledWith('porte', 'Médio');
      expect(result).toHaveLength(1);
    });

    it('deve capturar erro e exibir toast caso o Supabase falhe', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database offline') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const result = await service.fetchPets();

      expect(result).toEqual([]);
      expect(service.pets()).toEqual([]);
      expect(service.error()).toBe('Database offline');
      expect(toastMock.error).toHaveBeenCalledWith('Database offline');
    });
  });

  describe('getPetById e cache', () => {
    it('deve retornar pet do cache sem nova requisição se o id for igual e forceRefresh for false', async () => {
      service.setCachedPet(mockPets[0]);

      const pet = await service.getPetById(1, false);

      expect(pet).toEqual(mockPets[0]);
      expect(supabaseMock.client.from).not.toHaveBeenCalled();
    });

    it('deve buscar do Supabase se o cache estiver vazio ou se forceRefresh for true', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPets[1], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const pet = await service.getPetById(2, true);

      expect(pet).toEqual(mockPets[1]);
      expect(service.cachedPet()).toEqual(mockPets[1]);
    });

    it('deve buscar do Supabase com relacionamento de editor (updated_by)', async () => {
      const mockPetWithEditor = {
        ...mockPets[1],
        updated_by: 'user-uuid-123',
        editor: { id: 'user-uuid-123', email: 'voluntario@ong.org', role: 'user' },
      };
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPetWithEditor, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const pet = await service.getPetById(2, true);

      expect(queryBuilder.select).toHaveBeenCalledWith(
        '*, editor:updated_by(id, email, role), entradas(*)',
      );
      expect(pet).toEqual(mockPetWithEditor);
      expect(pet?.updated_by).toBe('user-uuid-123');
      expect(pet?.editor?.email).toBe('voluntario@ong.org');
    });

    it('deve executar fallback sem relacionamento editor caso ocorra erro no primeiro select', async () => {
      const fallbackBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPets[1], error: null }),
      };
      const primaryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('FK unmapped') }),
      };
      supabaseMock.client.from
        .mockReturnValueOnce(primaryBuilder)
        .mockReturnValueOnce(fallbackBuilder);

      const pet = await service.getPetById(2, true);

      expect(primaryBuilder.select).toHaveBeenCalledWith(
        '*, editor:updated_by(id, email, role), entradas(*)',
      );
      expect(fallbackBuilder.select).toHaveBeenCalledWith('*, entradas(*)');
      expect(pet).toEqual(mockPets[1]);
    });

    it('deve retornar null e exibir toast de erro se a consulta de pet por ID falhar', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Pet não encontrado') }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const pet = await service.getPetById(999, true);

      expect(pet).toBeNull();
      expect(toastMock.error).toHaveBeenCalledWith('Pet não encontrado');
      expect(service.loading()).toBe(false);
    });
  });

  describe('uploadPetFoto', () => {
    it('deve rejeitar arquivo com tipo MIME não suportado', async () => {
      const invalidFile = new File(['dummy'], 'arquivo.pdf', { type: 'application/pdf' });

      await expect(service.uploadPetFoto(invalidFile)).rejects.toThrow(
        'Formato de imagem inválido. Formatos aceitos: JPEG, PNG e WebP.',
      );
      expect(toastMock.error).toHaveBeenCalled();
    });

    it('deve fazer upload com sucesso para arquivo válido no storage', async () => {
      const validFile = new File(['valid content'], 'foto.webp', { type: 'image/webp' });
      const storageBuilder: any = {
        upload: vi.fn().mockResolvedValue({ error: null }),
      };
      supabaseMock.client.storage.from.mockReturnValue(storageBuilder);

      const filePath = await service.uploadPetFoto(validFile, 123);

      expect(supabaseMock.client.storage.from).toHaveBeenCalledWith('pets');
      expect(filePath).toMatch(/^avatars\/123-/);
      expect(storageBuilder.upload).toHaveBeenCalledWith(
        filePath,
        validFile,
        expect.objectContaining({ upsert: true, contentType: 'image/webp' }),
      );
    });

    it('deve disparar toast e lançar erro caso o upload para o storage falhe', async () => {
      const validFile = new File(['valid content'], 'foto.webp', { type: 'image/webp' });
      const storageBuilder: any = {
        upload: vi.fn().mockResolvedValue({ error: new Error('Storage bucket cheio') }),
      };
      supabaseMock.client.storage.from.mockReturnValue(storageBuilder);

      await expect(service.uploadPetFoto(validFile, 123)).rejects.toThrow('Storage bucket cheio');
      expect(toastMock.error).toHaveBeenCalledWith('Storage bucket cheio');
    });
  });

  describe('getSignedFotoUrl e deletePetFoto', () => {
    it('deve retornar null se caminhoFoto for vazio ou nulo', async () => {
      expect(await service.getSignedFotoUrl(null)).toBeNull();
      expect(await service.getSignedFotoUrl('')).toBeNull();
      expect(await service.getSignedFotoUrl('   ')).toBeNull();
    });

    it('deve gerar url assinada via storage.createSignedUrl', async () => {
      const storageBuilder: any = {
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({ data: { signedUrl: 'https://cdn.test/signed.jpg' }, error: null }),
      };
      supabaseMock.client.storage.from.mockReturnValue(storageBuilder);

      const url = await service.getSignedFotoUrl('avatars/rex.jpg');

      expect(url).toBe('https://cdn.test/signed.jpg');
      expect(storageBuilder.createSignedUrl).toHaveBeenCalledWith('avatars/rex.jpg', 3600);
    });

    it('deve reaproveitar a URL assinada em cache sem chamar storage.createSignedUrl novamente', async () => {
      const storageBuilder: any = {
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({ data: { signedUrl: 'https://cdn.test/cached.jpg' }, error: null }),
      };
      supabaseMock.client.storage.from.mockReturnValue(storageBuilder);

      const url1 = await service.getSignedFotoUrl('avatars/thor.jpg');
      expect(url1).toBe('https://cdn.test/cached.jpg');
      expect(storageBuilder.createSignedUrl).toHaveBeenCalledTimes(1);

      // Segunda chamada deve vir do cache
      const url2 = await service.getSignedFotoUrl('avatars/thor.jpg');
      expect(url2).toBe('https://cdn.test/cached.jpg');
      expect(storageBuilder.createSignedUrl).toHaveBeenCalledTimes(1);

      // Consulta síncrona do cache deve retornar a URL imediatamente
      expect(service.getCachedSignedFotoUrl('avatars/thor.jpg')).toBe(
        'https://cdn.test/cached.jpg',
      );
    });

    it('deve registrar e recuperar manualmente uma URL via setCachedSignedFotoUrl', () => {
      expect(service.getCachedSignedFotoUrl('avatars/manual.jpg')).toBeNull();

      service.setCachedSignedFotoUrl('avatars/manual.jpg', 'https://cdn.test/manual.jpg');
      expect(service.getCachedSignedFotoUrl('avatars/manual.jpg')).toBe(
        'https://cdn.test/manual.jpg',
      );
    });

    it('deve ignorar registro manual caso caminhoFoto ou url sejam vazios', () => {
      service.setCachedSignedFotoUrl('', 'https://cdn.test/empty.jpg');
      service.setCachedSignedFotoUrl(null, 'https://cdn.test/null.jpg');
      service.setCachedSignedFotoUrl('avatars/empty-url.jpg', '');

      expect(service.getCachedSignedFotoUrl('')).toBeNull();
      expect(service.getCachedSignedFotoUrl('avatars/empty-url.jpg')).toBeNull();
    });

    it('deve retornar null se storage.createSignedUrl retornar erro ou dados vazios', async () => {
      const storageBuilder: any = {
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Acesso negado') }),
      };
      supabaseMock.client.storage.from.mockReturnValue(storageBuilder);

      const url = await service.getSignedFotoUrl('avatars/rex.jpg');
      expect(url).toBeNull();
    });

    it('deve retornar null se ocorrer exceção ao gerar url assinada', async () => {
      const storageBuilder: any = {
        createSignedUrl: vi.fn().mockRejectedValue(new Error('Network offline')),
      };
      supabaseMock.client.storage.from.mockReturnValue(storageBuilder);

      const url = await service.getSignedFotoUrl('avatars/rex.jpg');
      expect(url).toBeNull();
    });

    it('deve retornar precocemente se caminhoFoto for nulo ao deletar foto', async () => {
      await service.deletePetFoto(null);
      await service.deletePetFoto('');
      expect(supabaseMock.client.storage.from).not.toHaveBeenCalled();
    });

    it('deve remover foto do storage ao deletar', async () => {
      const storageBuilder: any = {
        remove: vi.fn().mockResolvedValue({ error: null }),
      };
      supabaseMock.client.storage.from.mockReturnValue(storageBuilder);

      await service.deletePetFoto('avatars/rex.jpg');

      expect(storageBuilder.remove).toHaveBeenCalledWith(['avatars/rex.jpg']);
    });
  });

  describe('createPet', () => {
    it('deve chamar RPC create_pet_com_entrada e notificar sucesso', async () => {
      supabaseMock.client.rpc.mockResolvedValue({ data: { pet_id: 10 }, error: null });

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...mockPets[0], id: 10 }, error: null }),
        order: vi.fn().mockResolvedValue({ data: mockPets, error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const dto: PetCreateDto = {
        nome: 'Bob',
        tipo_pet: 'Cachorro',
        sexo: 'Macho',
        status: 'Disponível',
        local_origem: 'Rua das Flores',
        data_entrada: '2026-10-18',
        resgatante: 'Voluntário João',
        observacoes: 'Resgatado bem cuidado',
      };

      const result = await service.createPet(dto);

      expect(supabaseMock.client.rpc).toHaveBeenCalledWith(
        'create_pet_com_entrada',
        expect.objectContaining({
          p_entrada_data: {
            local_origem: 'Rua das Flores',
            data_entrada: '2026-10-18',
            resgatante: 'Voluntário João',
            observacoes: 'Resgatado bem cuidado',
          },
        }),
      );
      expect(toastMock.success).toHaveBeenCalledWith('Pet "Bob" cadastrado com sucesso!');
      expect(result?.id).toBe(10);
    });

    it('deve capturar erro e disparar toast se o RPC create_pet falhar', async () => {
      supabaseMock.client.rpc.mockResolvedValue({
        data: null,
        error: new Error('Erro ao salvar no banco'),
      });

      const dto: PetCreateDto = {
        nome: 'Bob',
        tipo_pet: 'Cachorro',
        sexo: 'Macho',
        status: 'Disponível',
        local_origem: 'Rua das Flores',
        data_entrada: '2026-10-18',
      };

      await expect(service.createPet(dto)).rejects.toThrow('Erro ao salvar no banco');
      expect(toastMock.error).toHaveBeenCalledWith('Erro ao salvar no banco');
      expect(service.loading()).toBe(false);
    });
  });

  describe('updatePet', () => {
    it('deve chamar RPC update_pet_com_entrada, atualizar cache e notificar sucesso', async () => {
      supabaseMock.client.rpc.mockResolvedValue({ error: null });

      const updatedPet = { ...mockPets[0], nome: 'Rex Atualizado' };
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedPet, error: null }),
        order: vi.fn().mockResolvedValue({ data: [updatedPet], error: null }),
      };
      supabaseMock.client.from.mockReturnValue(queryBuilder);

      const dto: PetUpdateDto = { nome: 'Rex Atualizado' };
      const result = await service.updatePet(1, dto);

      expect(supabaseMock.client.rpc).toHaveBeenCalledWith('update_pet_com_entrada', {
        p_pet_id: 1,
        p_pet_data: dto,
        p_entrada_data: null,
      });
      expect(toastMock.success).toHaveBeenCalledWith(
        'Pet "Rex Atualizado" atualizado com sucesso!',
      );
      expect(result).toEqual(updatedPet);
      expect(service.cachedPet()).toEqual(updatedPet);
    });

    it('deve capturar erro e disparar toast caso o RPC update_pet falhe', async () => {
      supabaseMock.client.rpc.mockResolvedValue({ error: new Error('Falha na atualização') });

      const dto: PetUpdateDto = { nome: 'Rex' };
      await expect(service.updatePet(1, dto)).rejects.toThrow('Falha na atualização');
      expect(toastMock.error).toHaveBeenCalledWith('Falha na atualização');
      expect(service.loading()).toBe(false);
    });
  });

  describe('adotarPet', () => {
    it('deve chamar RPC adotar_pet, atualizar status localmente e disparar toast comemorativo', async () => {
      supabaseMock.client.rpc.mockResolvedValue({ data: null, error: null });

      const dto: AdotarPetDto = {
        id_local: 5,
        data_saida: '2026-10-18',
        motivo_saida: 'Adoção Definitiva',
        obs: 'Família exemplar',
        valor_auxilio: 100,
      };

      const success = await service.adotarPet(1, dto);

      expect(success).toBe(true);
      expect(supabaseMock.client.rpc).toHaveBeenCalledWith('adotar_pet', {
        p_pet_id: 1,
        p_pet_local_data: {
          id_local: 5,
          data_saida: '2026-10-18',
          motivo_saida: 'Adoção Definitiva',
          obs: 'Família exemplar',
          valor_auxilio: 100,
        },
      });
      expect(toastMock.success).toHaveBeenCalledWith(
        'Adoção registrada com sucesso! Parabéns ao animal e à nova família!',
      );
    });

    it('deve capturar erro e disparar toast se a procedure adotarPet falhar', async () => {
      supabaseMock.client.rpc.mockResolvedValue({
        data: null,
        error: new Error('Pet não elegível para adoção'),
      });

      const dto: AdotarPetDto = {
        id_local: 5,
        data_saida: '2026-10-18',
      };

      await expect(service.adotarPet(1, dto)).rejects.toThrow('Pet não elegível para adoção');
      expect(toastMock.error).toHaveBeenCalledWith('Pet não elegível para adoção');
      expect(service.loading()).toBe(false);
    });
  });
});
