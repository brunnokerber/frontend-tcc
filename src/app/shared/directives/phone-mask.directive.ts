import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: 'input[appPhoneMask]',
  standalone: true,
})
export class PhoneMaskDirective {
  private el = inject(ElementRef<HTMLInputElement>);

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;
    const digits = input.value.replace(/\D/g, '').substring(0, 11);

    let formatted = '';
    if (digits.length > 10) {
      // 11 dígitos: (XX) XXXXX-XXXX
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else if (digits.length > 6) {
      // 7 a 10 dígitos: (XX) XXXX-XXXX
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    } else if (digits.length > 2) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }

    if (input.value !== formatted) {
      input.value = formatted;
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Tab',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Enter',
      'Escape',
    ];

    if (
      allowedKeys.includes(event.key) ||
      (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase())) ||
      (event.metaKey && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase()))
    ) {
      return;
    }

    // Permitir apenas dígitos
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }
}
