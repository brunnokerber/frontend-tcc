import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  evaluatePasswordStrength,
  SENHA_FORTE_REGEX,
  strongPasswordValidator,
} from './password.validators';

describe('Password Validators (RN03 / RN04)', () => {
  describe('evaluatePasswordStrength', () => {
    it('deve marcar todos os critérios como falsos para valores vazios ou nulos', () => {
      const resultNull = evaluatePasswordStrength(null);
      expect(resultNull.hasMinLength).toBe(false);
      expect(resultNull.hasUpperCase).toBe(false);
      expect(resultNull.hasLowerCase).toBe(false);
      expect(resultNull.hasNumber).toBe(false);
      expect(resultNull.hasSymbol).toBe(false);
      expect(resultNull.isValid).toBe(false);

      const resultEmpty = evaluatePasswordStrength('');
      expect(resultEmpty.isValid).toBe(false);
    });

    it('deve validar o comprimento mínimo de 8 caracteres', () => {
      const short = evaluatePasswordStrength('Ab1!xyz');
      expect(short.hasMinLength).toBe(false);
      expect(short.isValid).toBe(false);

      const validLength = evaluatePasswordStrength('Ab1!xyzw');
      expect(validLength.hasMinLength).toBe(true);
      expect(validLength.isValid).toBe(true);
    });

    it('deve exigir ao menos uma letra maiúscula', () => {
      const noUpper = evaluatePasswordStrength('ab1!xyzw');
      expect(noUpper.hasUpperCase).toBe(false);
      expect(noUpper.isValid).toBe(false);

      const withUpper = evaluatePasswordStrength('Ab1!xyzw');
      expect(withUpper.hasUpperCase).toBe(true);
    });

    it('deve exigir ao menos uma letra minúscula', () => {
      const noLower = evaluatePasswordStrength('AB1!XYZW');
      expect(noLower.hasLowerCase).toBe(false);
      expect(noLower.isValid).toBe(false);

      const withLower = evaluatePasswordStrength('Ab1!XYZW');
      expect(withLower.hasLowerCase).toBe(true);
    });

    it('deve exigir ao menos um dígito numérico', () => {
      const noNumber = evaluatePasswordStrength('Abc!xyzw');
      expect(noNumber.hasNumber).toBe(false);
      expect(noNumber.isValid).toBe(false);

      const withNumber = evaluatePasswordStrength('Ab1!xyzw');
      expect(withNumber.hasNumber).toBe(true);
    });

    it('deve exigir ao menos um símbolo / caractere especial', () => {
      const noSymbol = evaluatePasswordStrength('Ab12xyzw');
      expect(noSymbol.hasSymbol).toBe(false);
      expect(noSymbol.isValid).toBe(false);

      const withSymbol = evaluatePasswordStrength('Ab1@xyzw');
      expect(withSymbol.hasSymbol).toBe(true);
      expect(withSymbol.isValid).toBe(true);
    });
  });

  describe('strongPasswordValidator', () => {
    const validator = strongPasswordValidator();

    it('deve retornar null quando o campo for nulo ou vazio (deixando a obrigatoriedade para Validators.required)', () => {
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });

    it('deve retornar objeto com strongPassword quando os critérios não forem atendidos', () => {
      const control = new FormControl('123456');
      const errors = validator(control);
      expect(errors).not.toBeNull();
      expect(errors?.['strongPassword']).toBeDefined();
      expect(errors?.['strongPassword'].hasMinLength).toBe(false);
      expect(errors?.['strongPassword'].hasUpperCase).toBe(false);
      expect(errors?.['strongPassword'].message).toContain('ao menos 8 caracteres');
    });

    it('deve retornar null para senhas fortes e válidas', () => {
      const control = new FormControl('Admin@123');
      expect(validator(control)).toBeNull();
    });
  });

  describe('SENHA_FORTE_REGEX', () => {
    it('deve validar corretamente strings segundo a expressão regular', () => {
      expect(SENHA_FORTE_REGEX.test('Admin@123')).toBe(true);
      expect(SENHA_FORTE_REGEX.test('Senha#2026')).toBe(true);
      expect(SENHA_FORTE_REGEX.test('fraca')).toBe(false);
      expect(SENHA_FORTE_REGEX.test('SemNumero!')).toBe(false);
      expect(SENHA_FORTE_REGEX.test('semmaiuscula1@')).toBe(false);
      expect(SENHA_FORTE_REGEX.test('SEMMINUSCULA1@')).toBe(false);
    });
  });
});
