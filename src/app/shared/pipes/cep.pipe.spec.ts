import { describe, expect, it } from 'vitest';
import { CepPipe } from './cep.pipe';

describe('CepPipe', () => {
  const pipe = new CepPipe();

  it('deve retornar string vazia para valores nulos, indefinidos ou vazios', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('deve formatar CEP com 8 dígitos para XXXXX-XXX', () => {
    expect(pipe.transform('93300000')).toBe('93300-000');
    expect(pipe.transform(93300000)).toBe('93300-000');
    expect(pipe.transform('93300-000')).toBe('93300-000');
  });

  it('deve retornar o valor original caso não possua exatamente 8 dígitos', () => {
    expect(pipe.transform('1234')).toBe('1234');
    expect(pipe.transform('123456789')).toBe('123456789');
  });
});
