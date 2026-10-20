import { describe, expect, it } from 'vitest';
import {
  dateToIsoString,
  formatCep,
  formatPhone,
  getTodayIso,
  onlyDigits,
  parseIsoToDate,
  sanitize,
} from './string-utils';

describe('String Utils', () => {
  describe('sanitize', () => {
    it('deve retornar null para strings vazias, nulas, indefinidas ou com apenas espaços', () => {
      expect(sanitize(null)).toBeNull();
      expect(sanitize(undefined)).toBeNull();
      expect(sanitize('')).toBeNull();
      expect(sanitize('   ')).toBeNull();
    });

    it('deve remover espaços em branco das extremidades', () => {
      expect(sanitize('  Peludinhos do Vale  ')).toBe('Peludinhos do Vale');
      expect(sanitize('Rex')).toBe('Rex');
    });
  });

  describe('dateToIsoString', () => {
    it('deve retornar null para valores vazios ou inválidos', () => {
      expect(dateToIsoString(null)).toBeNull();
      expect(dateToIsoString(undefined)).toBeNull();
      expect(dateToIsoString('')).toBeNull();
      expect(dateToIsoString('   ')).toBeNull();
      expect(dateToIsoString(new Date('invalida'))).toBeNull();
    });

    it('deve converter objeto Date para ISO YYYY-MM-DD', () => {
      const date = new Date(2026, 9, 18); // 18 de Outubro de 2026
      expect(dateToIsoString(date)).toBe('2026-10-18');
    });

    it('deve converter string no formato brasileiro DD/MM/YYYY para YYYY-MM-DD', () => {
      expect(dateToIsoString('18/10/2026')).toBe('2026-10-18');
      expect(dateToIsoString('05/01/2024')).toBe('2024-01-05');
    });

    it('deve truncar strings ISO contendo horário para apenas a data', () => {
      expect(dateToIsoString('2026-10-18T15:30:00.000Z')).toBe('2026-10-18');
    });
  });

  describe('getTodayIso', () => {
    it('deve retornar a data de hoje no formato YYYY-MM-DD', () => {
      const todayIso = getTodayIso();
      expect(todayIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const now = new Date();
      expect(todayIso.startsWith(String(now.getFullYear()))).toBe(true);
    });
  });

  describe('parseIsoToDate', () => {
    it('deve retornar null para datas nulas, vazias ou incompletas', () => {
      expect(parseIsoToDate(null)).toBeNull();
      expect(parseIsoToDate('')).toBeNull();
      expect(parseIsoToDate('2026-10')).toBeNull();
    });

    it('deve converter YYYY-MM-DD para objeto Date correspondente', () => {
      const parsed = parseIsoToDate('2026-10-18');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(9); // Outubro
      expect(parsed?.getDate()).toBe(18);
    });
  });

  describe('onlyDigits', () => {
    it('deve extrair exclusivamente dígitos numéricos', () => {
      expect(onlyDigits(null)).toBe('');
      expect(onlyDigits(undefined)).toBe('');
      expect(onlyDigits('(51) 99999-8888')).toBe('51999998888');
      expect(onlyDigits('CEP 93.300-000!')).toBe('93300000');
      expect(onlyDigits('sem_numeros')).toBe('');
    });
  });

  describe('formatPhone', () => {
    it('deve formatar número de celular com 11 dígitos', () => {
      expect(formatPhone('51999998888')).toBe('(51) 99999-8888');
    });

    it('deve formatar número fixo com 10 dígitos', () => {
      expect(formatPhone('5133334444')).toBe('(51) 3333-4444');
    });

    it('deve retornar vazio para valores nulos ou vazios', () => {
      expect(formatPhone(null)).toBe('');
      expect(formatPhone('')).toBe('');
    });

    it('deve retornar o valor original caso não possua 10 ou 11 dígitos', () => {
      expect(formatPhone('123')).toBe('123');
    });
  });

  describe('formatCep', () => {
    it('deve formatar CEP com 8 dígitos no padrão XXXXX-XXX', () => {
      expect(formatCep('93300000')).toBe('93300-000');
      expect(formatCep('93300-000')).toBe('93300-000');
    });

    it('deve retornar vazio para valores vazios ou nulos', () => {
      expect(formatCep(null)).toBe('');
      expect(formatCep('')).toBe('');
    });

    it('deve retornar valor original caso não tenha 8 dígitos', () => {
      expect(formatCep('1234')).toBe('1234');
    });
  });
});
