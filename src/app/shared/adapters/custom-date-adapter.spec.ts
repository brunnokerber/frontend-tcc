import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CustomDateAdapter } from './custom-date-adapter';

describe('CustomDateAdapter (Formatação Brasileira DD/MM/YYYY)', () => {
  let adapter: CustomDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        CustomDateAdapter,
        { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
      ],
    });
    adapter = TestBed.inject(CustomDateAdapter);
  });

  describe('parse', () => {
    it('deve fazer o parse correto de formato brasileiro DD/MM/YYYY', () => {
      const parsed = adapter.parse('18/10/2026');
      expect(parsed).not.toBeNull();
      expect(adapter.isValid(parsed!)).toBe(true);
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(9); // Outubro
      expect(parsed?.getDate()).toBe(18);
    });

    it('deve fazer o parse correto de formato ISO YYYY-MM-DD', () => {
      const parsed = adapter.parse('2026-10-18');
      expect(parsed).not.toBeNull();
      expect(adapter.isValid(parsed!)).toBe(true);
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(9);
      expect(parsed?.getDate()).toBe(18);
    });

    it('deve retornar data inválida para strings mal formatadas', () => {
      const invalid = adapter.parse('data/invalida/xyz');
      expect(adapter.isValid(invalid!)).toBe(false);
    });

    it('deve retornar null para valores vazios', () => {
      expect(adapter.parse(null)).toBeNull();
      expect(adapter.parse('')).toBeNull();
      expect(adapter.parse('   ')).toBeNull();
    });
  });

  describe('format', () => {
    it('deve formatar objeto Date no padrão DD/MM/YYYY com padding de zero', () => {
      const date = new Date(2026, 0, 5); // 05 de Janeiro de 2026
      const formatted = adapter.format(date, 'DD/MM/YYYY');
      expect(formatted).toBe('05/01/2026');
    });

    it('deve formatar datas com dois dígitos normalmente', () => {
      const date = new Date(2026, 9, 18);
      const formatted = adapter.format(date, 'DD/MM/YYYY');
      expect(formatted).toBe('18/10/2026');
    });
  });
});
