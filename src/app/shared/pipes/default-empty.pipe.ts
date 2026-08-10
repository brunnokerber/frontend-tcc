import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'defaultEmpty',
  standalone: true,
  pure: true
})
export class DefaultEmptyPipe implements PipeTransform {

  transform(value: unknown, fallback = '-'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    if (Array.isArray(value) && value.length === 0) {
      return fallback;
    }

    return String(value);
  }
}