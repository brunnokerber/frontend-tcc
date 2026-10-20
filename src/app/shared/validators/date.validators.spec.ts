import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  dateNotBeforeDateValidator,
  dateSequenceValidator,
  maxDateTodayValidator,
  normalizeToMidnight,
} from './date.validators';

describe('Date Validators (RN10 / RN11 / RN12)', () => {
  describe('normalizeToMidnight', () => {
    it('deve retornar null para valores vazios ou inválidos', () => {
      expect(normalizeToMidnight(null)).toBeNull();
      expect(normalizeToMidnight(undefined)).toBeNull();
      expect(normalizeToMidnight('')).toBeNull();
      expect(normalizeToMidnight('data-invalida')).toBeNull();
      expect(normalizeToMidnight(new Date('invalida'))).toBeNull();
    });

    it('deve normalizar objeto Date para meia-noite (00:00:00.000)', () => {
      const now = new Date(2026, 9, 15, 14, 30, 45, 500);
      const normalized = normalizeToMidnight(now);
      expect(normalized).not.toBeNull();
      expect(normalized?.getHours()).toBe(0);
      expect(normalized?.getMinutes()).toBe(0);
      expect(normalized?.getSeconds()).toBe(0);
      expect(normalized?.getMilliseconds()).toBe(0);
      expect(normalized?.getDate()).toBe(15);
      expect(normalized?.getMonth()).toBe(9);
      expect(normalized?.getFullYear()).toBe(2026);
    });

    it('deve converter formato ISO (YYYY-MM-DD) para Date à meia-noite', () => {
      const normalized = normalizeToMidnight('2026-10-18');
      expect(normalized).not.toBeNull();
      expect(normalized?.getFullYear()).toBe(2026);
      expect(normalized?.getMonth()).toBe(9); // Outubro (0-indexed)
      expect(normalized?.getDate()).toBe(18);
    });

    it('deve converter formato brasileiro (DD/MM/YYYY) para Date à meia-noite', () => {
      const normalized = normalizeToMidnight('18/10/2026');
      expect(normalized).not.toBeNull();
      expect(normalized?.getFullYear()).toBe(2026);
      expect(normalized?.getMonth()).toBe(9);
      expect(normalized?.getDate()).toBe(18);
    });
  });

  describe('maxDateTodayValidator', () => {
    const validator = maxDateTodayValidator('A data não pode ser futura');

    it('deve retornar null quando o campo estiver vazio ou nulo', () => {
      expect(validator(new FormControl(null))).toBeNull();
      expect(validator(new FormControl(''))).toBeNull();
    });

    it('deve retornar null para a data de hoje', () => {
      const today = new Date();
      expect(validator(new FormControl(today))).toBeNull();
    });

    it('deve retornar null para datas passadas', () => {
      const past = new Date(2020, 0, 1);
      expect(validator(new FormControl(past))).toBeNull();
      expect(validator(new FormControl('2020-01-01'))).toBeNull();
    });

    it('deve retornar erro para datas futuras', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const errors = validator(new FormControl(tomorrow));
      expect(errors).not.toBeNull();
      expect(errors?.['dataFutura'].message).toBe('A data não pode ser futura');
    });
  });

  describe('dateSequenceValidator', () => {
    it('deve validar se a data final é maior ou igual à data inicial', () => {
      const form = new FormGroup(
        {
          inicio: new FormControl('2026-10-01'),
          fim: new FormControl('2026-10-10'),
        },
        {
          validators: [dateSequenceValidator('inicio', 'fim', 'dataFimInvalida', 'Fim inválido')],
        },
      );

      form.updateValueAndValidity();
      expect(form.valid).toBe(true);
      expect(form.controls.fim.errors).toBeNull();
    });

    it('deve acusar erro quando a data final for anterior à inicial', () => {
      const form = new FormGroup(
        {
          inicio: new FormControl('2026-10-10'),
          fim: new FormControl('2026-10-05'),
        },
        {
          validators: [dateSequenceValidator('inicio', 'fim', 'dataFimInvalida', 'Fim inválido')],
        },
      );

      form.updateValueAndValidity();
      expect(form.controls.fim.errors?.['dataFimInvalida']).toBeDefined();
    });

    it('deve limpar o erro do campo quando a data for corrigida', () => {
      const form = new FormGroup(
        {
          inicio: new FormControl('2026-10-10'),
          fim: new FormControl('2026-10-05'),
        },
        {
          validators: [dateSequenceValidator('inicio', 'fim', 'dataFimInvalida', 'Fim inválido')],
        },
      );

      form.updateValueAndValidity();
      expect(form.controls.fim.errors?.['dataFimInvalida']).toBeDefined();

      form.controls.fim.setValue('2026-10-15');
      form.updateValueAndValidity();
      expect(form.controls.fim.errors).toBeNull();
    });
  });

  describe('dateNotBeforeDateValidator', () => {
    it('deve impedir data anterior a uma data base estipulada', () => {
      const birthDate = '2024-01-01';
      const validator = dateNotBeforeDateValidator(
        () => birthDate,
        'antesNascimento',
        'Não pode ser anterior ao nascimento',
      );

      // Data válida: posterior ao nascimento
      expect(validator(new FormControl('2024-06-01'))).toBeNull();

      // Data inválida: anterior ao nascimento
      const errors = validator(new FormControl('2023-12-31'));
      expect(errors?.['antesNascimento']).toBeDefined();
      expect(errors?.['antesNascimento'].message).toBe('Não pode ser anterior ao nascimento');
    });
  });
});
