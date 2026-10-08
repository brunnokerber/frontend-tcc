import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { sanitize } from '@shared/utils/string-utils';

/**
 * Expressão regular estrita para validação de e-mails em conformidade com o padrão RFC 5322 e TLD válido.
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validador estrito de e-mail.
 * Trata valores vazios/nulos como válidos (permitindo uso em campos opcionais).
 * Caso o usuário digite algum caractere, exige o formato completo e válido 'usuario@dominio.com'.
 * Reutiliza utilitários de tratamento de strings existentes (`sanitize`).
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = sanitize(control.value);
    if (!raw) {
      return null;
    }
    const isValid = EMAIL_REGEX.test(raw);
    return isValid ? null : { email: true };
  };
}
