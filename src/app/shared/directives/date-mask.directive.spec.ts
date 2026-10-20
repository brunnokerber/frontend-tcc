import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { DateMaskDirective } from './date-mask.directive';

@Component({
  standalone: true,
  imports: [DateMaskDirective],
  template: `<input appDateMask />`,
})
class TestHostComponent {}

describe('DateMaskDirective (Máscara de Data DD/MM/YYYY)', () => {
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

  it('deve aplicar máscara DD/MM/YYYY ao digitar 8 dígitos', () => {
    inputEl.value = '18102026';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputEl.value).toBe('18/10/2026');
  });

  it('deve formatar parcialmente com barras intermediárias', () => {
    inputEl.value = '18';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('18');

    inputEl.value = '181';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('18/1');

    inputEl.value = '1810';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('18/10');

    inputEl.value = '18102';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('18/10/2');
  });

  it('deve bloquear digitação de letras', () => {
    const keyEvent = new KeyboardEvent('keydown', { key: 'x', cancelable: true });
    inputEl.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(true);
  });
});
