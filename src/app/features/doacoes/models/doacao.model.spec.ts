import { describe, expect, it } from 'vitest';
import {
  calcularPercentualDirecionado,
  calcularSaldoDisponivel,
  calcularStatusDoacao,
  calcularVolumeDirecionado,
  DirecionamentoDoacao,
  Doacao,
  enriquecerDoacao,
} from './doacao.model';

describe('Doacao Domain Model & Calculators', () => {
  it('calcularVolumeDirecionado deve somar volumes e retornar 0 para listas vazias ou indefinidas', () => {
    expect(calcularVolumeDirecionado()).toBe(0);
    expect(calcularVolumeDirecionado([])).toBe(0);

    const direcionamentos: DirecionamentoDoacao[] = [
      {
        id: 1,
        id_doacao: 10,
        id_local: 2,
        volume: 15.5,
        created_at: '2026-10-24T10:00:00Z',
        updated_at: '2026-10-24T10:00:00Z',
      },
      {
        id: 2,
        id_doacao: 10,
        id_local: 3,
        volume: 24.5,
        created_at: '2026-10-24T11:00:00Z',
        updated_at: '2026-10-24T11:00:00Z',
      },
    ];

    expect(calcularVolumeDirecionado(direcionamentos)).toBe(40);
  });

  it('calcularSaldoDisponivel deve calcular saldo restante e não retornar valores negativos', () => {
    expect(calcularSaldoDisponivel(100, 40)).toBe(60);
    expect(calcularSaldoDisponivel(50, 50)).toBe(0);
    expect(calcularSaldoDisponivel(30, 45)).toBe(0);
  });

  it('calcularPercentualDirecionado deve calcular porcentagem limitada entre 0 e 100', () => {
    expect(calcularPercentualDirecionado(0, 10)).toBe(0);
    expect(calcularPercentualDirecionado(100, 25)).toBe(25);
    expect(calcularPercentualDirecionado(80, 40)).toBe(50);
    expect(calcularPercentualDirecionado(50, 50)).toBe(100);
    expect(calcularPercentualDirecionado(50, 60)).toBe(100);
  });

  it('calcularStatusDoacao deve categorizar corretamente disponivel, parcial ou esgotado', () => {
    expect(calcularStatusDoacao(100, 0)).toBe('disponivel');
    expect(calcularStatusDoacao(100, 30)).toBe('parcial');
    expect(calcularStatusDoacao(100, 100)).toBe('esgotado');
    expect(calcularStatusDoacao(100, 120)).toBe('esgotado');
  });

  it('enriquecerDoacao deve enriquecer a doacao com metricas consolidadas', () => {
    const raw: Doacao = {
      id: 1,
      tipo_doacao: 'Ração',
      volume: 80,
      doador: 'Agropet Vale',
      telefone: '51999998888',
      unidade_medida: 'kg',
      created_at: '2026-10-24T09:00:00Z',
      updated_at: '2026-10-24T09:00:00Z',
    };

    const direcionamentos: DirecionamentoDoacao[] = [
      {
        id: 101,
        id_doacao: 1,
        id_local: 5,
        volume: 20,
        created_at: '2026-10-24T10:00:00Z',
        updated_at: '2026-10-24T10:00:00Z',
      },
    ];

    const result = enriquecerDoacao(raw, direcionamentos);

    expect(result.volume_direcionado).toBe(20);
    expect(result.volume_disponivel).toBe(60);
    expect(result.percentual_direcionado).toBe(25);
    expect(result.status).toBe('parcial');
    expect(result.direcionamentos?.length).toBe(1);
  });
});
