import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { CepMaskDirective } from './cep-mask.directive';

@Component({
  standalone: true,
  imports: [CepMaskDirective],
  template: `<input appCepMask />`,
})
class TestHostComponent {}

describe('CepMaskDirective (Máscara de CEP XXXXX-XXX)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let inputEl: HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
  });

  it('deve aplicar máscara XXXXX-XXX ao digitar 8 dígitos', () => {
    inputEl.value = '93510250';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputEl.value).toBe('93510-250');
  });

  it('deve manter sem hífen se houver 5 dígitos ou menos', () => {
    inputEl.value = '93510';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputEl.value).toBe('93510');
  });

  it('deve limitar a entrada a 8 dígitos máximos', () => {
    inputEl.value = '935102509999';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputEl.value).toBe('93510-250');
  });

  it('deve bloquear digitação de letras', () => {
    const keyEvent = new KeyboardEvent('keydown', { key: 'b', cancelable: true });
    inputEl.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(true);
  });
});
