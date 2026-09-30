import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@core/auth/services/auth.service';
import { AppRole, UserProfile } from '@core/auth/models/login.model';
import { SupabaseService } from '@core/services/supabase';
import { ToastService } from '@core/services/toast.service';
import { extractFunctionErrorMessage } from '@shared/utils/supabase-error.utils';

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
   * Altera o status (ativo/inativo) de uma conta via Edge Function "toggle-user-status".
   * Atualiza a tabela profiles e aplica/remove banimento no Supabase Auth síncronamente.
   */
  async toggleStatus(userId: string, ativo: boolean): Promise<boolean> {
    this.loadingSignal.set(true);
    try {
      const { data, error } = await this.supabase.client.functions.invoke('toggle-user-status', {
        body: {
          userId,
          ativo,
        },
      });

      if (error) {
        const msg = await extractFunctionErrorMessage(
          error,
          `Erro ao ${ativo ? 'reativar' : 'desativar'} conta de usuário.`
        );
        throw new Error(msg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      this.toast.success(
        ativo
          ? 'Conta de usuário reativada com sucesso.'
          : 'Conta de usuário desativada com sucesso.'
      );
      await this.fetchUsuarios();
      return true;
    } catch (err: any) {
      const msg =
        err.message ||
        `Erro ao ${ativo ? 'reativar' : 'desativar'} conta de usuário.`;
      this.toast.error(msg);
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Desativa uma conta de usuário (Aplica ban no Auth e soft delete lógico em profiles).
   */
  async deactivateUsuario(userId: string): Promise<boolean> {
    return this.toggleStatus(userId, false);
  }

  /**
   * Reativa uma conta de usuário previamente desativada (Remove ban no Auth e reativa em profiles).
   */
  async reactivateUsuario(userId: string): Promise<boolean> {
    return this.toggleStatus(userId, true);
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
   * Realiza a auto-desativação da própria conta via Edge Function e encerra a sessão.
   */
  async deactivateSelf(): Promise<boolean> {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) {
      this.toast.error('Usuário não identificado.');
      return false;
    }

    const success = await this.toggleStatus(currentUserId, false);
    if (success) {
      this.toast.info('Sua conta foi desativada com sucesso. Até logo!');
      this.authService.logout();
      return true;
    }
    return false;
  }
}
