import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { onlyDigits, sanitize } from '@shared/utils/string-utils';

/**
 * Validador de número de telefone brasileiro com DDD (10 ou 11 dígitos).
 * Suporta formatos mascarados (ex: `(51) 99999-9999`, `(51) 3333-3333`) ou apenas dígitos numéricos.
 * Reutiliza utilitários de tratamento de strings existentes (`onlyDigits`, `sanitize`).
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = sanitize(control.value);
    if (!raw) {
      return null;
    }

    const digits = onlyDigits(raw);

    // Comprimento deve ser exatamente 10 ou 11 dígitos
    if (digits.length !== 10 && digits.length !== 11) {
      return { telefoneInvalido: true };
    }

    // Validação do DDD (entre 11 e 99)
    const ddd = parseInt(digits.substring(0, 2), 10);
    if (isNaN(ddd) || ddd < 11 || ddd > 99) {
      return { telefoneInvalido: true };
    }

    // Se celular (11 dígitos), nono dígito obrigatório (inicia com 9)
    if (digits.length === 11 && digits.charAt(2) !== '9') {
      return { telefoneInvalido: true };
    }

    // Rejeita sequências de dígitos todos iguais
    if (/^(\d)\1+$/.test(digits)) {
      return { telefoneInvalido: true };
    }

    return null;
  };
}
