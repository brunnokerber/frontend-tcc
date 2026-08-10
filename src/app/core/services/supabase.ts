import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private authService = inject(AuthService);

  constructor() {
    this.supabase = createClient(
      environment.apiUrl,
      environment.apiKey,
      {
        accessToken: async () => {
          const token = this.authService.getToken();
          return token ? token : ''; 
        }
      }
    );
  }

  get client() {
    return this.supabase;
  }
}