import { describe, expect, it } from 'vitest';
import { DefaultEmptyPipe } from './default-empty.pipe';

describe('DefaultEmptyPipe', () => {
  const pipe = new DefaultEmptyPipe();

  it('deve retornar o caractere padrão "-" para valores nulos, indefinidos ou vazios', () => {
    expect(pipe.transform(null)).toBe('-');
    expect(pipe.transform(undefined)).toBe('-');
    expect(pipe.transform('')).toBe('-');
  });

  it('deve retornar o fallback para arrays vazios', () => {
    expect(pipe.transform([])).toBe('-');
  });

  it('deve permitir definir um fallback customizado', () => {
    expect(pipe.transform(null, 'Não informado')).toBe('Não informado');
    expect(pipe.transform('', 'Sem registro')).toBe('Sem registro');
    expect(pipe.transform([], 'Vazio')).toBe('Vazio');
  });

  it('deve retornar o valor convertido em string quando preenchido', () => {
    expect(pipe.transform('Rex')).toBe('Rex');
    expect(pipe.transform(1234)).toBe('1234');
    expect(pipe.transform(0)).toBe('0');
    expect(pipe.transform(false)).toBe('false');
  });
});
