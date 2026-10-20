import { describe, expect, it } from 'vitest';
import { CnpjPipe } from './cnpj.pipe';

describe('CnpjPipe', () => {
  const pipe = new CnpjPipe();

  it('deve retornar string vazia para valores nulos, indefinidos ou vazios', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('deve formatar CNPJ com 14 dígitos para XX.XXX.XXX/XXXX-XX', () => {
    expect(pipe.transform('12345678000199')).toBe('12.345.678/0001-99');
    expect(pipe.transform('12.345.678/0001-99')).toBe('12.345.678/0001-99');
  });

  it('deve retornar o valor original caso não possua 14 dígitos', () => {
    expect(pipe.transform('12345')).toBe('12345');
    expect(pipe.transform('1234567800019999')).toBe('1234567800019999');
  });
});
