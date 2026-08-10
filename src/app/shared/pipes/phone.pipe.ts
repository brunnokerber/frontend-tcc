import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneMask',
  standalone: true,
  pure: true
})
export class PhonePipe implements PipeTransform {

  transform(value: string | number | undefined | null): string {
    // 1. Fail-fast para valores nulos/vazios
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // 2. Normalização: String segura e apenas dígitos
    const fone = String(value).replace(/\D/g, '');

    // 3. Lógica de Máscara (Celular vs Fixo)
    // Usamos fatiamento de string (substring) que é mais rápido que Regex para decisões simples
    const length = fone.length;

    if (length === 11) {
      // Celular: (00) 00000-0000
      return fone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    if (length === 10) {
      // Fixo: (00) 0000-0000
      return fone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    // 4. Caso especial: Números sem DDD (8 ou 9 dígitos)
    if (length === 9) {
      return fone.replace(/(\d{5})(\d{4})/, '$1-$2');
    }
    if (length === 8) {
      return fone.replace(/(\d{4})(\d{4})/, '$1-$2');
    }

    // Se o tamanho for estranho, devolvemos o valor original formatado como string
    return String(value);
  }
}