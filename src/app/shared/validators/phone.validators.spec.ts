import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { phoneValidator } from './phone.validators';

describe('Phone Validator', () => {
  const validator = phoneValidator();

  it('deve permitir campos vazios ou nulos (deixando obrigatoriedade para Validators.required)', () => {
    expect(validator(new FormControl(''))).toBeNull();
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl('   '))).toBeNull();
  });

  it('deve aceitar telefone celular válido com 11 dígitos (com e sem máscara)', () => {
    expect(validator(new FormControl('51999998888'))).toBeNull();
    expect(validator(new FormControl('(51) 99999-8888'))).toBeNull();
    expect(validator(new FormControl('(11) 98765-4321'))).toBeNull();
  });

  it('deve aceitar telefone fixo válido com 10 dígitos (com e sem máscara)', () => {
    expect(validator(new FormControl('5133334444'))).toBeNull();
    expect(validator(new FormControl('(51) 3333-4444'))).toBeNull();
    expect(validator(new FormControl('(21) 2222-3333'))).toBeNull();
  });

  it('deve rejeitar telefones com comprimento incorreto', () => {
    expect(validator(new FormControl('123456789'))).toEqual({ telefoneInvalido: true });
    expect(validator(new FormControl('123456789012'))).toEqual({ telefoneInvalido: true });
  });

  it('deve rejeitar DDD inválido (menor que 11 ou maior que 99)', () => {
    expect(validator(new FormControl('05999998888'))).toEqual({ telefoneInvalido: true });
    expect(validator(new FormControl('00999998888'))).toEqual({ telefoneInvalido: true });
  });

  it('deve rejeitar celular de 11 dígitos que não inicia com 9', () => {
    expect(validator(new FormControl('51899998888'))).toEqual({ telefoneInvalido: true });
    expect(validator(new FormControl('51799998888'))).toEqual({ telefoneInvalido: true });
  });

  it('deve rejeitar números com todos os dígitos repetidos', () => {
    expect(validator(new FormControl('11111111111'))).toEqual({ telefoneInvalido: true });
    expect(validator(new FormControl('99999999999'))).toEqual({ telefoneInvalido: true });
    expect(validator(new FormControl('(55) 5555-5555'))).toEqual({ telefoneInvalido: true });
  });
});
