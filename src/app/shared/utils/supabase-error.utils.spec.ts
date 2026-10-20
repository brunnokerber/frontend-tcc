import { describe, expect, it } from 'vitest';
import {
  extractErrorMessage,
  extractFunctionErrorMessage,
  parseFunctionError,
} from './supabase-error.utils';

describe('Supabase Error Utils', () => {
  describe('parseFunctionError', () => {
    it('deve retornar mensagem de fallback quando o erro for nulo ou indefinido', async () => {
      const res = await parseFunctionError(null, 'Erro customizado de fallback');
      expect(res.message).toBe('Erro customizado de fallback');
    });

    it('deve extrair corpo de erro do SDK do Supabase (FunctionsHttpError via context.json())', async () => {
      const mockError = {
        context: {
          json: async () => ({
            message: 'E-mail já cadastrado no sistema.',
            code: 'user_already_exists',
          }),
        },
      };

      const res = await parseFunctionError(mockError);
      expect(res.message).toBe('E-mail já cadastrado no sistema.');
      expect(res.code).toBe('user_already_exists');
    });

    it('deve suportar campo error quando message não estiver presente no corpo JSON', async () => {
      const mockError = {
        context: {
          json: async () => ({
            error: 'Permissão negada para esta operação.',
          }),
        },
      };

      const res = await parseFunctionError(mockError);
      expect(res.message).toBe('Permissão negada para esta operação.');
    });

    it('deve tratar falha na leitura do stream do context.json() usando mensagem fallback', async () => {
      const mockError = {
        message: 'Falha na conexão',
        context: {
          json: async () => {
            throw new Error('Stream already consumed');
          },
        },
      };

      const res = await parseFunctionError(mockError);
      expect(res.message).toBe('Falha na conexão');
    });

    it('deve extrair corpo de erro vindo do Angular HttpClient (error.error)', async () => {
      const mockHttpError = {
        error: {
          message: 'Token expirado. Realize novo login.',
          code: 'invalid_jwt',
        },
      };

      const res = await parseFunctionError(mockHttpError);
      expect(res.message).toBe('Token expirado. Realize novo login.');
      expect(res.code).toBe('invalid_jwt');
    });

    it('deve ignorar mensagem genérica "Edge Function returned a non-2xx status code" e usar o fallback', async () => {
      const genericError = {
        message: 'Edge Function returned a non-2xx status code',
      };

      const res = await parseFunctionError(genericError, 'Serviço indisponível');
      expect(res.message).toBe('Serviço indisponível');
    });
  });

  describe('extractFunctionErrorMessage', () => {
    it('deve retornar diretamente a string da mensagem de erro', async () => {
      const mockError = {
        error: {
          message: 'Usuário desativado pelo administrador.',
        },
      };

      const msg = await extractFunctionErrorMessage(mockError);
      expect(msg).toBe('Usuário desativado pelo administrador.');
    });
  });

  describe('extractErrorMessage', () => {
    it('deve extrair mensagem de instância de Error', () => {
      expect(extractErrorMessage(new Error('Erro padrão'))).toBe('Erro padrão');
    });

    it('deve extrair mensagem de objeto com campo message', () => {
      expect(extractErrorMessage({ message: 'Objeto com mensagem' })).toBe('Objeto com mensagem');
    });

    it('deve extrair mensagem de string', () => {
      expect(extractErrorMessage('Falha de rede')).toBe('Falha de rede');
    });

    it('deve retornar fallback se o erro não for identificável', () => {
      expect(extractErrorMessage(null, 'Erro fallback')).toBe('Erro fallback');
      expect(extractErrorMessage(undefined, 'Erro fallback')).toBe('Erro fallback');
      expect(extractErrorMessage({}, 'Erro fallback')).toBe('Erro fallback');
    });
  });
});
