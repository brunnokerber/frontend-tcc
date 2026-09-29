import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { environment } from '@env/environment';

import type { AppRole, LoginRequest, LoginResponse } from '../models/login.model';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly MUST_SET_PASSWORD_KEY = 'app_must_set_password';
  private readonly currentUser = signal<LoginResponse | null>(this.loadUserFromStorage());
  public readonly mustSetPassword = signal<boolean>(this.loadMustSetPassword());
  private refreshPromise: Promise<string | null> | null = null;

  public readonly isAuthenticated = computed(() => {
    const payload = this.currentUser();
    if (!payload) { return false; }

    // Se temos refresh token, a sessão é recuperável
    if (payload.refresh_token) {
      return true;
    }

    if (payload.expires_at && Date.now() >= (payload.expires_at * 1000)) {
      return false;
    }

    return true;
  });

  public readonly role = computed(() => {
    const user = this.currentUser()?.user;
    if (!user) return null;
    return user.role || user.app_metadata?.role || user.user_metadata?.role || null;
  });
  public readonly isAdmin = computed(() => this.role() === 'admin');

  private loadMustSetPassword(): boolean {
    return localStorage.getItem(this.MUST_SET_PASSWORD_KEY) === 'true';
  }

  public setMustSetPassword(must: boolean): void {
    if (must) {
      localStorage.setItem(this.MUST_SET_PASSWORD_KEY, 'true');
    } else {
      localStorage.removeItem(this.MUST_SET_PASSWORD_KEY);
    }
    this.mustSetPassword.set(must);
  }

  public getUserId(): string | null {
    return this.currentUser()?.user?.id || null;
  }

  public getUser(): LoginResponse['user'] | null {
    return this.currentUser()?.user || null;
  }

  public getRole(): AppRole | null {
    return this.role();
  }

  public getUserSignal() {
    return this.currentUser.asReadonly();
  }

  private loadUserFromStorage(): LoginResponse | null {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) return null;
    try {
      const parsed: LoginResponse = JSON.parse(storedUser);
      if (parsed?.user) {
        const resolvedRole =
          parsed.user.role ||
          parsed.user.app_metadata?.role ||
          parsed.user.user_metadata?.role ||
          'user';
        parsed.user.role = resolvedRole;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveUserToStorage(user: LoginResponse) {
    if (user?.user) {
      const resolvedRole =
        user.user.role ||
        user.user.app_metadata?.role ||
        user.user.user_metadata?.role ||
        'user';
      user.user.role = resolvedRole;
    }
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private removeUserFromStorage() {
    localStorage.removeItem('currentUser');
  }

  private fetchUserRole(userId: string, accessToken: string, fallbackRole?: AppRole): Observable<AppRole> {
    return this.http.get<{ role: AppRole }[]>(
      `${environment.apiUrl}/rest/v1/profiles`,
      {
        headers: {
          apikey: environment.apiKey,
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          id: `eq.${userId}`,
          select: 'role'
        }
      }
    ).pipe(
      map(profiles => profiles[0]?.role || fallbackRole || 'user'),
      catchError(() => of(fallbackRole || ('user' as AppRole)))
    );
  }

  //========================================  
  public login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.API_URL}/v1/token`,
      request,
      {
        headers: {
          apikey: environment.apiKey
        },
        params: {
          grant_type: 'password'
        }
      }
    ).pipe(
      switchMap((resp) => {
        const userId = resp.user?.id;
        const accessToken = resp.access_token;
        const metaRole = (resp.user?.app_metadata?.role || resp.user?.user_metadata?.role) as AppRole | undefined;

        if (!userId || !accessToken) {
          const finalRole = metaRole || 'user';
          return of({
            ...resp,
            user: { ...resp.user, role: finalRole }
          });
        }

        return this.fetchUserRole(userId, accessToken, metaRole).pipe(
          map((role) => ({
            ...resp,
            user: {
              ...resp.user,
              role: role || metaRole || 'user'
            }
          }))
        );
      }),
      tap((resp) => {
        this.saveUserToStorage(resp);
        this.currentUser.set(resp);
      })
    );
  }

  /**
   * Executa a renovação do token de acesso utilizando o refresh_token salvo.
   */
  public refreshToken(): Observable<LoginResponse> {
    const current = this.currentUser();
    const refreshToken = current?.refresh_token;

    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('Refresh token não disponível.'));
    }

    return this.http.post<LoginResponse>(
      `${this.API_URL}/v1/token`,
      { refresh_token: refreshToken },
      {
        headers: {
          apikey: environment.apiKey
        },
        params: {
          grant_type: 'refresh_token'
        }
      }
    ).pipe(
      switchMap((resp) => {
        const userId = resp.user?.id || current.user?.id;
        const accessToken = resp.access_token;
        const currentMetaRole = (
          resp.user?.app_metadata?.role ||
          resp.user?.user_metadata?.role ||
          current.user?.role ||
          current.user?.app_metadata?.role ||
          current.user?.user_metadata?.role
        ) as AppRole | undefined;

        if (!userId || !accessToken) {
          return of({
            ...resp,
            user: { ...resp.user, role: currentMetaRole || 'user' }
          });
        }

        return this.fetchUserRole(userId, accessToken, currentMetaRole).pipe(
          map((role) => ({
            ...resp,
            user: {
              ...resp.user,
              role: role || currentMetaRole || 'user'
            }
          }))
        );
      }),
      tap((resp) => {
        this.saveUserToStorage(resp);
        this.currentUser.set(resp);
      }),
      catchError((err) => {
        console.warn('Sessão expirada ou refresh token inválido:', err);
        this.logout();
        throw err;
      })
    );
  }

  /**
   * Retorna um access_token garantidamente válido. Se estiver prestes a expirar
   * ou expirado, renova automaticamente de forma thread-safe/concorrente.
   */
  public async getValidToken(): Promise<string | null> {
    const user = this.currentUser();
    if (!user) return null;

    // Se o token ainda é válido com margem de segurança de 60 segundos
    const nowSec = Math.floor(Date.now() / 1000);
    if (user.expires_at && user.expires_at > nowSec + 60) {
      return user.access_token;
    }

    // Se possui refresh token, tenta renovar (evitando chamadas paralelas concorrentes)
    if (user.refresh_token) {
      if (!this.refreshPromise) {
        this.refreshPromise = firstValueFrom(this.refreshToken())
          .then((resp) => resp.access_token)
          .catch(() => null)
          .finally(() => {
            this.refreshPromise = null;
          });
      }
      return this.refreshPromise;
    }

    return null;
  }

  /**
   * Valida se a sessão atual é válida ou recuperável.
   */
  public async ensureValidSession(): Promise<boolean> {
    const token = await this.getValidToken();
    return !!token;
  }

  /**
   * Dispara o convite de novo usuário na plataforma (Apenas Administradores).
   * Aciona a Edge Function "invite-user" do Supabase.
   */
  public async inviteUser(
    email: string,
    role: AppRole = 'user',
    redirectTo?: string
  ): Promise<{ success: boolean; message?: string }> {
    const token = await this.getValidToken();
    if (!token) {
      throw new Error('Sessão inválida ou expirada. Faça login novamente.');
    }

    const targetRedirect =
      redirectTo || `${window.location.origin}/definir-senha`;

    const body = {
      email: email.trim().toLowerCase(),
      role: role,
      redirectTo: targetRedirect,
    };

    return firstValueFrom(
      this.http.post<{ success: boolean; message?: string }>(`${environment.apiUrl}/functions/v1/invite-user`, body, {
        headers: {
          apikey: environment.apiKey,
          Authorization: `Bearer ${token}`,
        },
      }).pipe(
        map((resp) => resp || { success: true }),
        catchError((err) => {
          const msg =
            err.error?.error ||
            err.error?.msg ||
            err.error?.message ||
            err.message ||
            'Erro ao enviar convite para o usuário.';
          return throwError(() => new Error(msg));
        })
      )
    );
  }

  /**
   * Dispara o envio administrativo de e-mail de redefinição de senha para um usuário já cadastrado (Apenas Administradores).
   * Aciona a Edge Function "admin-reset-password" do Supabase.
   */
  public async sendResetPassword(
    email: string,
    redirectTo?: string
  ): Promise<{ success: boolean; message?: string }> {
    const token = await this.getValidToken();
    if (!token) {
      throw new Error('Sessão inválida ou expirada. Faça login novamente.');
    }

    const targetRedirect =
      redirectTo || `${window.location.origin}/definir-senha`;

    const body = {
      email: email.trim().toLowerCase(),
      redirectTo: targetRedirect,
    };

    return firstValueFrom(
      this.http.post<{ success: boolean; message?: string }>(`${environment.apiUrl}/functions/v1/admin-reset-password`, body, {
        headers: {
          apikey: environment.apiKey,
          Authorization: `Bearer ${token}`,
        },
      }).pipe(
        map((resp) => resp || { success: true }),
        catchError((err) => {
          const msg =
            err.error?.error ||
            err.error?.msg ||
            err.error?.message ||
            err.message ||
            'Erro ao disparar e-mail de redefinição de senha.';
          return throwError(() => new Error(msg));
        })
      )
    );
  }

  /**
   * Solicitação pública de redefinição de senha (Autoatendimento "Esqueci minha senha" na tela de Login).
   * Aciona o endpoint público /auth/v1/recover do Supabase com rate limit e envio do link de recuperação.
   */
  public async requestPasswordReset(
    email: string,
    redirectTo?: string
  ): Promise<{ success: boolean; message?: string }> {
    const targetRedirect =
      redirectTo || `${window.location.origin}/definir-senha`;
    const cleanEmail = email.trim().toLowerCase();

    return firstValueFrom(
      this.http
        .post<any>(
          `${this.API_URL}/v1/recover`,
          { email: cleanEmail },
          {
            headers: {
              apikey: environment.apiKey,
            },
            params: {
              redirect_to: targetRedirect,
            },
          }
        )
        .pipe(
          map(() => ({ success: true })),
          catchError((err) => {
            const msg =
              err.error?.msg ||
              err.error?.message ||
              err.error?.error_description ||
              err.message ||
              'Erro ao solicitar redefinição de senha.';
            return throwError(() => new Error(msg));
          })
        )
    );
  }

  /**
   * Captura tokens de autenticação presentes no fragmento de hash da URL (#access_token=...)
   * disparados por links de confirmação de e-mail/convite do Supabase.
   */
  public captureSessionFromUrlHash(): { hasSession: boolean; type?: string; email?: string } {
    if (typeof window === 'undefined' || !window.location.hash) {
      return { hasSession: false };
    }

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = Number(params.get('expires_in')) || 3600;
    const expiresAt =
      Number(params.get('expires_at')) || Math.floor(Date.now() / 1000) + expiresIn;
    const tokenType = params.get('token_type') || 'bearer';
    const type = params.get('type') || undefined;

    if (!accessToken) {
      return { hasSession: false };
    }

    try {
      // Decodifica o payload do JWT para extrair os dados do usuário convidado
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);

      const resolvedRole =
        (decoded.app_metadata?.role ||
          decoded.user_metadata?.role ||
          'user') as AppRole;

      const user = {
        id: decoded.sub || '',
        email: decoded.email || '',
        role: resolvedRole,
        app_metadata: decoded.app_metadata,
        user_metadata: decoded.user_metadata,
      };

      const loginResponse: LoginResponse = {
        access_token: accessToken,
        refresh_token: refreshToken || '',
        expires_at: expiresAt,
        expires_in: expiresIn,
        token_type: tokenType,
        user,
      };

      this.saveUserToStorage(loginResponse);
      this.currentUser.set(loginResponse);

      // Se for convite ou recuperação, ativa a barreira obrigatória de primeiro acesso
      if (type === 'invite' || type === 'recovery') {
        this.setMustSetPassword(true);
      }

      // Limpa os tokens da URL para segurança
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      return { hasSession: true, type, email: user.email };
    } catch (err) {
      console.error('Erro ao processar tokens da URL hash:', err);
      return { hasSession: false };
    }
  }

  /**
   * Atualiza a senha do usuário autenticado atual (usado para primeiro acesso ou redefinição).
   */
  public async updatePassword(newPassword: string): Promise<boolean> {
    const token = await this.getValidToken();
    if (!token) {
      throw new Error('Sessão expirada. Por favor, acesse o link de convite novamente.');
    }

    return firstValueFrom(
      this.http
        .put<any>(
          `${this.API_URL}/v1/user`,
          { password: newPassword },
          {
            headers: {
              apikey: environment.apiKey,
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .pipe(
          tap(() => {
            // Libera a trava obrigatória de primeiro acesso
            this.setMustSetPassword(false);
          }),
          map(() => true),
          catchError((err) => {
            const msg =
              err.error?.msg ||
              err.error?.message ||
              err.error?.error_description ||
              err.message ||
              'Erro ao atualizar a senha.';
            return throwError(() => new Error(msg));
          })
        )
    );
  }

  public logout() {
    this.removeUserFromStorage();
    this.setMustSetPassword(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}