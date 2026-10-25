import { inject, Injectable } from '@angular/core';
import { AuthService } from '@core/auth/services/auth.service';
import { UserProfile } from '@core/auth/models/login.model';
import { SupabaseService } from '@core/services/supabase';

@Injectable({
  providedIn: 'root',
})
export class AuditResolverService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  private readonly cache = new Map<string, UserProfile | null>();
  private readonly pendingRequests = new Map<string, Promise<UserProfile | null>>();

  /**
   * Resolve os dados de um perfil de usuário a partir do UUID (apenas para Administradores).
   * Utiliza cache em memória para garantir tempo de resposta de 0ms em consultas repetidas
   * e deduplicação de requisições simultâneas.
   */
  async resolveUser(userId: string | null | undefined): Promise<UserProfile | null> {
    if (!userId || !userId.trim()) {
      return null;
    }

    const trimmedId = userId.trim();

    if (this.cache.has(trimmedId)) {
      return this.cache.get(trimmedId) ?? null;
    }

    // Apenas administradores têm permissão para inspecionar identidades de outros usuários
    if (!this.authService.isAdmin()) {
      return null;
    }

    if (this.pendingRequests.has(trimmedId)) {
      return this.pendingRequests.get(trimmedId)!;
    }

    const fetchPromise = (async (): Promise<UserProfile | null> => {
      try {
        const { data, error } = await this.supabase.client
          .from('profiles')
          .select('id, email, role, ativo, created_at')
          .eq('id', trimmedId)
          .maybeSingle();

        if (error || !data) {
          this.cache.set(trimmedId, null);
          return null;
        }

        const profile = data as UserProfile;
        this.cache.set(trimmedId, profile);
        return profile;
      } catch {
        this.cache.set(trimmedId, null);
        return null;
      } finally {
        this.pendingRequests.delete(trimmedId);
      }
    })();

    this.pendingRequests.set(trimmedId, fetchPromise);
    return fetchPromise;
  }

  /**
   * Pré-popula o cache em memória com dados conhecidos
   */
  setCachedUser(user: UserProfile): void {
    if (user?.id) {
      this.cache.set(user.id, user);
    }
  }

  /**
   * Limpa o cache em memória (ex: em logout ou testes)
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}
