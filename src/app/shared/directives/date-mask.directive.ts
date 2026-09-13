import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: 'input[appDateMask]',
  standalone: true,
})
export class DateMaskDirective {
  private el = inject(ElementRef<HTMLInputElement>);

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;
    const digits = input.value.replace(/\D/g, '').substring(0, 8);

    let formatted = '';
    if (digits.length > 4) {
      formatted = `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.substring(0, 2)}/${digits.substring(2)}`;
    } else {
      formatted = digits;
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

    // Permitir apenas dígitos numéricos
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }
}
