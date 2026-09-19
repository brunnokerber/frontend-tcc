import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private location = inject(Location);
  private router = inject(Router);

  /**
   * Retorna à página anterior no histórico do navegador.
   * Caso não haja histórico (ex: acesso direto à URL), redireciona para a rota de fallback.
   *
   * @param fallbackUrl Rota para onde redirecionar se não houver histórico (padrão: '/')
   */
  public back(fallbackUrl: string | any[] = ['/']): void {
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      this.location.back();
    } else {
      if (typeof fallbackUrl === 'string') {
        this.router.navigateByUrl(fallbackUrl);
      } else {
        this.router.navigate(fallbackUrl);
      }
    }
  }
}
