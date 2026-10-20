import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Expressão regular estrita para validação de senha forte:
 * - Comprimento mínimo: 8 caracteres
 * - Ao menos uma letra maiúscula (A-Z)
 * - Ao menos uma letra minúscula (a-z)
 * - Ao menos um número (0-9)
 * - Ao menos um símbolo / caractere especial (!@#$%^&*()_+-=[]{};':"|,.<>/?~`)
 */
export const SENHA_FORTE_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,}$/;

/**
 * Interface com os critérios individuais avaliados para feedback visual em tempo real.
 */
export interface PasswordCriteria {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isValid: boolean;
}

/**
 * Avalia detalhadamente o cumprimento de cada critério de segurança de senha.
 * Usado tanto para validação quanto para o checklist reativo da interface.
 */
export function evaluatePasswordStrength(password: string | null | undefined): PasswordCriteria {
  const val = password ?? '';
  const hasMinLength = val.length >= 8;
  const hasUpperCase = /[A-Z]/.test(val);
  const hasLowerCase = /[a-z]/.test(val);
  const hasNumber = /\d/.test(val);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(val);

  return {
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSymbol,
    isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol,
  };
}

/**
 * Validador síncrono para Angular Reactive Forms que garante a conformidade com a
 * política de senhas fortes do Supabase Auth.
 */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Validators.required trata campos vazios
    }

    const criteria = evaluatePasswordStrength(value);
    if (criteria.isValid) {
      return null;
    }

    return {
      strongPassword: {
        ...criteria,
        message:
          'A senha deve conter ao menos 8 caracteres, incluindo letra maiúscula, minúscula, número e caractere especial.',
      },
    };
  };
}
