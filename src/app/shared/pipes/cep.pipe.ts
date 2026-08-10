import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cepMask',
  standalone: true,
  pure: true
})
export class CepPipe implements PipeTransform {

  transform(value: string | number | undefined | null): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const rawCep = String(value).replace(/\D/g, '');

    if (rawCep.length !== 8) {
      return String(value);
    }

    return rawCep.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
}