import { describe, expect, it } from 'vitest';
import { CustomPaginatorIntl } from './custom-paginator-intl';

describe('CustomPaginatorIntl (Internacionalização da Paginação Angular Material)', () => {
  const intl = new CustomPaginatorIntl();

  it('deve possuir os rótulos corretos em português', () => {
    expect(intl.itemsPerPageLabel).toBe('Itens por página:');
    expect(intl.nextPageLabel).toBe('Próxima página');
    expect(intl.previousPageLabel).toBe('Página anterior');
    expect(intl.firstPageLabel).toBe('Primeira página');
    expect(intl.lastPageLabel).toBe('Última página');
  });

  describe('getRangeLabel', () => {
    it('deve formatar adequadamente quando length for 0', () => {
      expect(intl.getRangeLabel(0, 10, 0)).toBe('0 de 0');
    });

    it('deve formatar adequadamente quando pageSize for 0', () => {
      expect(intl.getRangeLabel(0, 0, 10)).toBe('0 de 10');
    });

    it('deve calcular intervalos da primeira página', () => {
      expect(intl.getRangeLabel(0, 10, 50)).toBe('1 – 10 de 50');
    });

    it('deve calcular intervalos de páginas intermediárias', () => {
      expect(intl.getRangeLabel(2, 10, 50)).toBe('21 – 30 de 50');
    });

    it('deve limitar o fim do intervalo ao total de registros na última página', () => {
      expect(intl.getRangeLabel(4, 10, 45)).toBe('41 – 45 de 45');
    });
  });
});
