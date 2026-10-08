import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Dicionário padrão e agnóstico de mensagens para validadores comuns.
 */
const DEFAULT_ERROR_MESSAGES: Record<string, string | ((err: any) => string)> = {
  required: 'Campo obrigatório',
  email: 'E-mail inválido',
  telefoneInvalido: 'Telefone inválido (DDD + 8 ou 9 dígitos)',
  phone: 'Telefone inválido (DDD + 8 ou 9 dígitos)',
  mask: 'Formato inválido',
  minlength: (err) => `Mínimo de ${err.requiredLength} caracteres`,
  maxlength: (err) => `Máximo de ${err.requiredLength} caracteres`,
  min: (err) => `O valor mínimo permitido é ${err.min}`,
  max: (err) => `O valor máximo permitido é ${err.max}`,
  matDatepickerParse: 'Data inválida ou formato incorreto',
  matDatepickerMin: 'Data anterior ao limite mínimo permitido',
  matDatepickerMax: 'Data posterior ao limite máximo permitido',
  mismatch: 'Os valores informados não conferem',
  strongPassword: 'Senha não atende aos requisitos de segurança',
  cnpjInvalido: 'CNPJ inválido ou inexistente',
};

// Prioridade de avaliação de erros para quando múltiplos validadores falham
const DEFAULT_PRIORITY: string[] = [
  'matDatepickerParse',
  'matDatepickerMin',
  'matDatepickerMax',
  'required',
  'mismatch',
  'strongPassword',
  'cnpjInvalido',
  'telefoneInvalido',
  'phone',
  'email',
  'mask',
  'minlength',
  'maxlength',
  'min',
  'max',
];

export type FormErrorParam = string | Record<string, string>;

@Pipe({
  name: 'formError',
  standalone: true,
  pure: false,
})
export class FormErrorPipe implements PipeTransform {
  transform(
    control: AbstractControl | null | undefined,
    customOverrides?: FormErrorParam
  ): string {
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors: ValidationErrors = control.errors;

    // Se foi passada uma string direta como override para qualquer erro ocorrido
    if (typeof customOverrides === 'string' && customOverrides.trim()) {
      return customOverrides;
    }

    // Identifica as chaves de erro presentes
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return '';

    // Seleciona a chave de erro prioritária:
    // 1. Chaves que possuam mensagem personalizada no erro do controle ({ message: '...' } ou string)
    // 2. Chaves com override fornecido no template (customOverrides)
    // 3. Ordem da lista padrão ou primeira chave presente
    const customKeyWithMessage = errorKeys.find(
      (key) =>
        typeof errors[key] === 'string' ||
        (errors[key] && typeof errors[key].message === 'string')
    );

    const overrideKey =
      typeof customOverrides === 'object' && customOverrides !== null
        ? errorKeys.find((key) => key in customOverrides)
        : null;

    const matchedKey =
      customKeyWithMessage ||
      overrideKey ||
      DEFAULT_PRIORITY.find((key) => key in errors) ||
      errorKeys[0];

    // 1. Se houver override parametrizado na chamada do pipe para essa chave
    if (
      typeof customOverrides === 'object' &&
      customOverrides !== null &&
      matchedKey in customOverrides
    ) {
      return customOverrides[matchedKey];
    }

    // 2. Se o próprio validador forneceu uma mensagem específica no erro
    const errValue = errors[matchedKey];
    if (typeof errValue === 'string' && errValue.trim()) {
      return errValue;
    }
    if (errValue && typeof errValue.message === 'string' && errValue.message.trim()) {
      return errValue.message;
    }

    // 3. Mensagem do dicionário padrão genérico
    const defaultProvider = DEFAULT_ERROR_MESSAGES[matchedKey];
    if (defaultProvider) {
      return typeof defaultProvider === 'function'
        ? defaultProvider(errValue)
        : defaultProvider;
    }

    return 'Valor inválido';
  }
}
