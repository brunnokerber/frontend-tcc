import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl } from '@angular/forms';

const ERROR_MESSAGES: Record<string, string | ((err: any) => string)> = {
  required: 'Campo obrigatório',
  email: 'E-mail inválido',
  mask: 'Formato inválido',
  minlength: (err) => `Mínimo de ${err.requiredLength} caracteres`,
  maxlength: (err) => `Máximo de ${err.requiredLength} caracteres`,
  matDatepickerParse: 'Data inválida',
  matDatepickerMin: 'A data não pode ser anterior ao permitido',
  mismatch: 'As senhas não conferem',
  strongPassword: 'Senha muito fraca para os requisitos',
  cnpjInvalido: 'CNPJ inválido ou inexistente'
};

@Pipe({
  name: 'formError',
  standalone: true,
  pure: false
})
export class FormErrorPipe implements PipeTransform {

  transform(control: AbstractControl | null | undefined): string {
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const firstErrorKey = Object.keys(control.errors)[0];
    const messageProvider = ERROR_MESSAGES[firstErrorKey];

    if (!messageProvider) {
      return 'Valor inválido';
    }

    return typeof messageProvider === 'function'
      ? messageProvider(control.errors[firstErrorKey])
      : messageProvider;
  }
}