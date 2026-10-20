import { describe, expect, it } from 'vitest';
import {
  calculateSenioridade,
  getSexoIcon,
  getStatusBadgeClass,
  getTipoBadgeClass,
  getTipoFaIcon,
} from './pet.model';

describe('Pet Model & Calculations (RN09)', () => {
  describe('calculateSenioridade', () => {
    it('deve retornar null para valores inválidos, nulos ou vazios', () => {
      expect(calculateSenioridade(null)).toBeNull();
      expect(calculateSenioridade(undefined)).toBeNull();
      expect(calculateSenioridade('')).toBeNull();
      expect(calculateSenioridade('data-invalida')).toBeNull();
      expect(calculateSenioridade(new Date('data-invalida'))).toBeNull();
    });

    it('deve retornar "Filhote" para animais com menos de 12 meses', () => {
      const today = new Date();
      // 6 meses atrás
      const seisMesesAtras = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      expect(calculateSenioridade(seisMesesAtras)).toBe('Filhote');

      // String ISO YYYY-MM-DD
      const year = seisMesesAtras.getFullYear();
      const month = String(seisMesesAtras.getMonth() + 1).padStart(2, '0');
      const day = String(seisMesesAtras.getDate()).padStart(2, '0');
      expect(calculateSenioridade(`${year}-${month}-${day}`)).toBe('Filhote');
    });

    it('deve retornar "Adulto" para animais com idade entre 1 ano e menos de 7 anos', () => {
      const today = new Date();
      // Exatamente 1 ano atrás
      const umAnoAtras = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      expect(calculateSenioridade(umAnoAtras)).toBe('Adulto');

      // 4 anos atrás
      const quatroAnosAtras = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate());
      expect(calculateSenioridade(quatroAnosAtras)).toBe('Adulto');
    });

    it('deve retornar "Sênior" para animais com 7 anos ou mais', () => {
      const today = new Date();
      // Exatamente 7 anos atrás
      const seteAnosAtras = new Date(today.getFullYear() - 7, today.getMonth(), today.getDate());
      expect(calculateSenioridade(seteAnosAtras)).toBe('Sênior');

      // 12 anos atrás
      const dozeAnosAtras = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
      expect(calculateSenioridade(dozeAnosAtras)).toBe('Sênior');
    });
  });

  describe('getStatusBadgeClass', () => {
    it('deve retornar a classe CSS correta para cada status do pet', () => {
      expect(getStatusBadgeClass('Disponível')).toBe('badge-status-disponivel');
      expect(getStatusBadgeClass('Em Tratamento')).toBe('badge-status-tratamento');
      expect(getStatusBadgeClass('Quarentena')).toBe('badge-status-quarentena');
      expect(getStatusBadgeClass('Adotado')).toBe('badge-status-adotado');
      expect(getStatusBadgeClass('Óbito')).toBe('badge-status-obito');
    });

    it('deve retornar "badge-status-disponivel" como fallback para status nulo ou desconhecido', () => {
      expect(getStatusBadgeClass(null)).toBe('badge-status-disponivel');
      expect(getStatusBadgeClass(undefined)).toBe('badge-status-disponivel');
      expect(getStatusBadgeClass('Inexistente')).toBe('badge-status-disponivel');
    });
  });

  describe('getTipoFaIcon', () => {
    it('deve retornar o ícone FontAwesome correspondente a cada espécie', () => {
      expect(getTipoFaIcon('Cachorro')).toBe('fa-solid fa-dog');
      expect(getTipoFaIcon('Gato')).toBe('fa-solid fa-cat');
      expect(getTipoFaIcon('Outro')).toBe('fa-solid fa-paw');
    });

    it('deve retornar "fa-solid fa-paw" como fallback quando nulo ou desconhecido', () => {
      expect(getTipoFaIcon(null)).toBe('fa-solid fa-paw');
      expect(getTipoFaIcon('Desconhecido')).toBe('fa-solid fa-paw');
    });
  });

  describe('getTipoBadgeClass', () => {
    it('deve retornar a classe de badge correspondente à espécie', () => {
      expect(getTipoBadgeClass('Cachorro')).toBe('bg-dog');
      expect(getTipoBadgeClass('Gato')).toBe('bg-cat');
      expect(getTipoBadgeClass('Outro')).toBe('bg-other');
      expect(getTipoBadgeClass('Coelho')).toBe('bg-other');
      expect(getTipoBadgeClass(null)).toBe('bg-dog');
    });
  });

  describe('getSexoIcon', () => {
    it('deve retornar o ícone Material correspondente ao sexo', () => {
      expect(getSexoIcon('Macho')).toBe('male');
      expect(getSexoIcon('Fêmea')).toBe('female');
      expect(getSexoIcon(null)).toBe('male');
    });
  });
});
