import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@core/auth/services/auth.service';
import { AppRole, UserProfile } from '@core/auth/models/login.model';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  private readonly usuariosSignal = signal<UserProfile[]>([]);
  public readonly usuarios = this.usuariosSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  public readonly loading = this.loadingSignal.asReadonly();

  /**
   * Busca a lista de todos os perfis cadastrados no sistema (Apenas Administradores).
   */
  async fetchUsuarios(): Promise<UserProfile[]> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const list = (data as UserProfile[]) || [];
      this.usuariosSignal.set(list);
      return list;
    } catch (err: any) {
      const msg = err.message || 'Erro ao carregar a lista de usuários.';
      this.toast.error(msg);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Desativa uma conta de usuário (Soft Delete lógico preservando integridade de auditoria).
   */
  async deactivateUsuario(userId: string): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({
          ativo: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      this.toast.success('Conta de usuário desativada com sucesso.');
      await this.fetchUsuarios();
      return true;
    } catch (err: any) {
      const msg = err.message || 'Erro ao desativar conta de usuário.';
      this.toast.error(msg);
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Reativa uma conta de usuário previamente desativada.
   */
  async reactivateUsuario(userId: string): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({
          ativo: true,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      this.toast.success('Conta de usuário reativada com sucesso.');
      await this.fetchUsuarios();
      return true;
    } catch (err: any) {
      const msg = err.message || 'Erro ao reativar conta de usuário.';
      this.toast.error(msg);
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Altera o perfil de permissão do usuário (Operador <-> Administrador).
   */
  async updateRole(userId: string, newRole: AppRole): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      this.toast.success(`Perfil atualizado para "${newRole === 'admin' ? 'Administrador' : 'Operador'}".`);
      await this.fetchUsuarios();
      return true;
    } catch (err: any) {
      const msg = err.message || 'Erro ao alterar perfil de permissão.';
      this.toast.error(msg);
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Realiza a auto-desativação (soft delete da própria conta do usuário logado) e encerra a sessão.
   */
  async deactivateSelf(): Promise<boolean> {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) {
      this.toast.error('Usuário não identificado.');
      return false;
    }

    try {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({
          ativo: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUserId);

      if (error) {
        throw error;
      }

      this.toast.info('Sua conta foi desativada com sucesso. Até logo!');
      this.authService.logout();
      return true;
    } catch (err: any) {
      const msg = err.message || 'Erro ao desativar sua conta.';
      this.toast.error(msg);
      return false;
    }
  }
}
