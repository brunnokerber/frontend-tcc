import { FormControl, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { FormErrorPipe } from './form-error.pipe';

describe('FormErrorPipe', () => {
  const pipe = new FormErrorPipe();

  it('deve retornar string vazia se o controle for nulo, indefinido ou não tiver erros', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');

    const validControl = new FormControl('valor');
    validControl.markAsTouched();
    expect(pipe.transform(validControl)).toBe('');
  });

  it('deve retornar string vazia se o controle tiver erros mas NÃO foi tocado (untouched)', () => {
    const control = new FormControl('', Validators.required);
    control.updateValueAndValidity();
    expect(control.errors).not.toBeNull();
    expect(control.touched).toBe(false);
    expect(pipe.transform(control)).toBe('');
  });

  it('deve retornar "Campo obrigatório" para erro required quando tocado', () => {
    const control = new FormControl('', Validators.required);
    control.markAsTouched();
    expect(pipe.transform(control)).toBe('Campo obrigatório');
  });

  it('deve retornar mensagem para erro email', () => {
    const control = new FormControl('invalido', Validators.email);
    control.markAsTouched();
    expect(pipe.transform(control)).toBe('E-mail inválido');
  });

  it('deve retornar mensagem dinâmica para erro minlength', () => {
    const control = new FormControl('ab', Validators.minLength(5));
    control.markAsTouched();
    expect(pipe.transform(control)).toBe('Mínimo de 5 caracteres');
  });

  it('deve retornar mensagem dinâmica para erro maxlength', () => {
    const control = new FormControl('123456', Validators.maxLength(3));
    control.markAsTouched();
    expect(pipe.transform(control)).toBe('Máximo de 3 caracteres');
  });

  it('deve retornar mensagem padrão para strongPassword', () => {
    const control = new FormControl('123');
    control.setErrors({ strongPassword: true });
    control.markAsTouched();
    expect(pipe.transform(control)).toBe(
      'A senha deve conter ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo',
    );
  });

  it('deve respeitar a mensagem embutida no objeto de erro (ex: dataFutura)', () => {
    const control = new FormControl('2030-01-01');
    control.setErrors({ dataFutura: { message: 'Data de vacina não pode ser futura' } });
    control.markAsTouched();
    expect(pipe.transform(control)).toBe('Data de vacina não pode ser futura');
  });

  it('deve permitir substituição customizada de mensagem via string direta', () => {
    const control = new FormControl('', Validators.required);
    control.markAsTouched();
    expect(pipe.transform(control, 'Por favor, informe seu nome completo')).toBe(
      'Por favor, informe seu nome completo',
    );
  });

  it('deve permitir substituição customizada via mapa de mensagens', () => {
    const control = new FormControl('', Validators.required);
    control.markAsTouched();
    const overrides = { required: 'O nome do animal é obrigatório.' };
    expect(pipe.transform(control, overrides)).toBe('O nome do animal é obrigatório.');
  });
});
