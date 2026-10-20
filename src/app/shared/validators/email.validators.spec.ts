import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { EMAIL_REGEX, emailValidator } from './email.validators';

describe('Email Validator', () => {
  const validator = emailValidator();

  it('deve permitir campos vazios ou nulos (deixando obrigatoriedade para Validators.required)', () => {
    expect(validator(new FormControl(''))).toBeNull();
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl('   '))).toBeNull();
  });

  it('deve aceitar e-mails válidos segundo padrão RFC 5322', () => {
    expect(validator(new FormControl('admin@admin.com'))).toBeNull();
    expect(validator(new FormControl('ong.peludinhos@feevale.br'))).toBeNull();
    expect(validator(new FormControl('usuario+tag@gmail.com'))).toBeNull();
    expect(validator(new FormControl('contato@sub.dominio.org'))).toBeNull();
  });

  it('deve rejeitar e-mails em formato inválido', () => {
    expect(validator(new FormControl('invalido'))).toEqual({ email: true });
    expect(validator(new FormControl('sem_arroba.com'))).toEqual({ email: true });
    expect(validator(new FormControl('@sem_usuario.com'))).toEqual({ email: true });
    expect(validator(new FormControl('usuario@sem_tld'))).toEqual({ email: true });
    expect(validator(new FormControl('usuario@dominio.'))).toEqual({ email: true });
  });

  it('deve testar EMAIL_REGEX diretamente', () => {
    expect(EMAIL_REGEX.test('valido@teste.com')).toBe(true);
    expect(EMAIL_REGEX.test('invalido')).toBe(false);
  });
});
