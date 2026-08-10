import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '@env/environment';

import type { LoginRequest, LoginResponse } from '../models/login.model';


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

  public getToken(): string | null {
    return this.currentUser()?.access_token || null;
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

  //========================================  
  public login(request: LoginRequest): Observable<LoginResponse> {
    const params = { grant_type: 'password' };
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