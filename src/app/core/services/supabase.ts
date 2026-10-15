import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '@core/auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private authService = inject(AuthService);

  /**
   * Fornece o cliente singleton do Supabase sincronizado com a autenticação da aplicação.
   */
  get client(): SupabaseClient {
    return this.authService.supabaseClient;
  }
}
