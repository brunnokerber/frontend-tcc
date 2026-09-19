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
  private readonly currentUser = signal<LoginResponse | null>(this.loadUserFromStorage());
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

  public readonly role = computed(() => this.currentUser()?.user?.role ?? null);
  public readonly isAdmin = computed(() => this.role() === 'admin');

  public getUserId(): string | null {
    return this.currentUser()?.user?.id || null;
  }

  public getUser(): LoginResponse['user'] | null {
    return this.currentUser()?.user || null;
  }

  public getRole(): AppRole | null {
    return this.currentUser()?.user?.role ?? null;
  }

  public getUserSignal() {
    return this.currentUser.asReadonly();
  }

  private loadUserFromStorage(): LoginResponse | null {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  }

  private saveUserToStorage(user: LoginResponse) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private removeUserFromStorage() {
    localStorage.removeItem('currentUser');
  }

  private fetchUserRole(userId: string, accessToken: string): Observable<AppRole> {
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
      map(profiles => profiles[0]?.role ?? 'user'),
      catchError(() => of('user' as AppRole))
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
        if (!userId || !accessToken) {
          return of(resp);
        }

        return this.fetchUserRole(userId, accessToken).pipe(
          map((role) => ({
            ...resp,
            user: {
              ...resp.user,
              role
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
        const currentRole = current.user?.role;

        if (!userId || !accessToken) {
          return of({
            ...resp,
            user: { ...resp.user, role: currentRole }
          });
        }

        return this.fetchUserRole(userId, accessToken).pipe(
          map((role) => ({
            ...resp,
            user: {
              ...resp.user,
              role: role || currentRole
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

  public logout() {
    this.removeUserFromStorage();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}