import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

export const BR_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      const parts = value.trim().split(/[\/\-\.]/);
      if (parts.length === 3) {
        let day: number, month: number, year: number;
        // YYYY-MM-DD
        if (parts[0].length === 4) {
          year = Number(parts[0]);
          month = Number(parts[1]) - 1;
          day = Number(parts[2]);
        } else {
          // DD/MM/YYYY
          day = Number(parts[0]);
          month = Number(parts[1]) - 1;
          year = Number(parts[2]);
        }

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const date = new Date(year, month, day);
          if (
            date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day
          ) {
            return date;
          }
        }
      }
      return this.invalid();
    }
    return value ? new Date(value as string | number | Date) : null;
  }

  override format(date: Date, displayFormat: any): string {
    if (displayFormat === 'DD/MM/YYYY') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }
}
