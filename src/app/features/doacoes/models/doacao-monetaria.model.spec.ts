import { describe, expect, it } from 'vitest';
import { formatCurrencyBRL } from './doacao-monetaria.model';

describe('DoacaoMonetaria Model & Utilities', () => {
  it('formatCurrencyBRL deve formatar valores monetários em Real (BRL) corretamente', () => {
    expect(formatCurrencyBRL(0)).toMatch(/R\$\s?0,00/);
    expect(formatCurrencyBRL(150.5)).toMatch(/R\$\s?150,50/);
    expect(formatCurrencyBRL(1250)).toMatch(/R\$\s?1\.250,00/);
  });

  it('formatCurrencyBRL deve retornar R$ 0,00 para valores nulos, indefinidos ou NaN', () => {
    expect(formatCurrencyBRL(null)).toMatch(/R\$\s?0,00/);
    expect(formatCurrencyBRL(undefined)).toMatch(/R\$\s?0,00/);
    expect(formatCurrencyBRL(NaN)).toMatch(/R\$\s?0,00/);
  });
});
