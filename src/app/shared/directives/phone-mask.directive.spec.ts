import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { PhoneMaskDirective } from './phone-mask.directive';

@Component({
  standalone: true,
  imports: [PhoneMaskDirective],
  template: `<input appPhoneMask />`,
})
class TestHostComponent {}

describe('PhoneMaskDirective (Máscara de Telefone Dinâmica)', () => {
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

  it('deve aplicar máscara (XX) XXXXX-XXXX para números de celular de 11 dígitos', () => {
    inputEl.value = '51999998888';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputEl.value).toBe('(51) 99999-8888');
  });

  it('deve aplicar máscara (XX) XXXX-XXXX para telefones fixos de 10 dígitos', () => {
    inputEl.value = '5135900000';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputEl.value).toBe('(51) 3590-0000');
  });

  it('deve formatar parcialmente números parciais', () => {
    inputEl.value = '51';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('(51');

    inputEl.value = '519';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('(51) 9');
  });

  it('deve bloquear caracteres não numéricos no keydown', () => {
    const keyEvent = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    inputEl.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(true);
  });

  it('deve permitir teclas de controle como Backspace, Tab e atalhos Ctrl+V', () => {
    const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    inputEl.dispatchEvent(backspaceEvent);
    expect(backspaceEvent.defaultPrevented).toBe(false);

    const pasteEvent = new KeyboardEvent('keydown', {
      key: 'v',
      ctrlKey: true,
      cancelable: true,
    });
    inputEl.dispatchEvent(pasteEvent);
    expect(pasteEvent.defaultPrevented).toBe(false);
  });
});
