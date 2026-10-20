import { describe, expect, it } from 'vitest';
import { PhonePipe } from './phone.pipe';

describe('PhonePipe', () => {
  const pipe = new PhonePipe();

  it('deve retornar string vazia para valores nulos, indefinidos ou vazios', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('deve formatar número de celular com 11 dígitos para (XX) XXXXX-XXXX', () => {
    expect(pipe.transform('51999998888')).toBe('(51) 99999-8888');
    expect(pipe.transform(51999998888)).toBe('(51) 99999-8888');
    expect(pipe.transform('(51) 99999-8888')).toBe('(51) 99999-8888');
  });

  it('deve formatar número fixo com 10 dígitos para (XX) XXXX-XXXX', () => {
    expect(pipe.transform('5133334444')).toBe('(51) 3333-4444');
    expect(pipe.transform(5133334444)).toBe('(51) 3333-4444');
  });

  it('deve formatar números sem DDD de 9 e 8 dígitos', () => {
    expect(pipe.transform('999998888')).toBe('99999-8888');
    expect(pipe.transform('33334444')).toBe('3333-4444');
  });

  it('deve retornar a representação em string do valor original se o tamanho for inesperado', () => {
    expect(pipe.transform('12345')).toBe('12345');
    expect(pipe.transform(123)).toBe('123');
  });
});
