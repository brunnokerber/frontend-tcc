import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

import { environment } from '@env/environment';

import type { AppRole, LoginRequest, LoginResponse } from '../models/login.model';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly currentUser = signal<LoginResponse | null>(this.loadUserFromStorage());

  public readonly isAuthenticated = computed(() => {
    const payload = this.currentUser();
    if (!payload) { return false; }

    if (payload.expires_at && Date.now() >= (payload.expires_at * 1000)) {
      return false;
    }

    return true;
  });

  public readonly role = computed(() => this.currentUser()?.user?.role ?? null);
  public readonly isAdmin = computed(() => this.role() === 'admin');

  public getToken(): string | null {
    return this.currentUser()?.access_token || null;
  }

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

  public logout() {
    this.removeUserFromStorage();
    this.router.navigate(['/login']);
  }
}