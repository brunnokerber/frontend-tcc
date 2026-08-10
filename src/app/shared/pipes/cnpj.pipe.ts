import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cnpjMask',
  standalone: true,
  pure: true
})
export class CnpjPipe implements PipeTransform {

  transform(value: string | number | undefined | null): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const cnpj = String(value).replace(/\D/g, '');

    if (cnpj.length !== 14) {
      return String(value);
    }

    //Formatação: 00.000.000/0000-00
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
}