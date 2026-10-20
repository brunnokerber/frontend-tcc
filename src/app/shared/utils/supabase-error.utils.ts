/**
 * Interface padronizada para o corpo de erro das Edge Functions do Supabase.
 */
export interface FunctionErrorResponse {
  message: string;
  error?: string;
  code?: string;
}

/**
 * Extrai os detalhes de erro de respostas das Edge Functions do Supabase,
 * suportando tanto chamadas via Supabase SDK (FunctionsHttpError) quanto Angular HttpClient (HttpErrorResponse).
 */
export async function parseFunctionError(
  error: unknown,
  fallbackMessage = 'Erro ao processar solicitação no servidor.',
): Promise<FunctionErrorResponse> {
  if (!error) {
    return { message: fallbackMessage };
  }

  const errObj =
    typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null;

  // 1. Supabase JS SDK: FunctionsHttpError (corpo da resposta dentro de error.context)
  if (errObj?.['context'] && typeof (errObj['context'] as { json?: unknown }).json === 'function') {
    try {
      const body = await (
        errObj['context'] as { json: () => Promise<Record<string, unknown>> }
      ).json();
      const message = (body['message'] || body['error'] || fallbackMessage) as string;
      const errorMsg = (body['error'] || body['message'] || fallbackMessage) as string;
      const code = body['code'] as string | undefined;
      return {
        message,
        error: errorMsg,
        code,
      };
    } catch {
      // Ignora caso o stream de resposta já tenha sido lido ou não seja JSON
    }
  }

  // 2. Angular HttpClient: HttpErrorResponse (corpo já parseado em error.error)
  if (errObj?.['error'] && typeof errObj['error'] === 'object' && errObj['error'] !== null) {
    const errorBody = errObj['error'] as Record<string, unknown>;
    const message = (errorBody['message'] || errorBody['error'] || fallbackMessage) as string;
    const errorMsg = (errorBody['error'] || errorBody['message'] || fallbackMessage) as string;
    const code = errorBody['code'] as string | undefined;
    return {
      message,
      error: errorMsg,
      code,
    };
  }

  // 3. Objeto de erro padrão ou string simples
  const rawMsg =
    errObj && typeof errObj['message'] === 'string'
      ? errObj['message']
      : typeof error === 'string'
        ? error
        : '';
  const msg =
    rawMsg && rawMsg !== 'Edge Function returned a non-2xx status code' ? rawMsg : fallbackMessage;

  const code = errObj && typeof errObj['code'] === 'string' ? errObj['code'] : undefined;

  return {
    message: msg,
    error: msg,
    code,
  };
}

/**
 * Helper de conveniência que retorna diretamente a mensagem amigável de erro em string.
 */
export async function extractFunctionErrorMessage(
  error: unknown,
  fallbackMessage = 'Erro ao processar solicitação no servidor.',
): Promise<string> {
  const parsed = await parseFunctionError(error, fallbackMessage);
  return parsed.message;
}

/**
 * Helper utilitário universal para extrair mensagens de erro com tipagem segura (eliminando 'any').
 */
export function extractErrorMessage(
  err: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
  }
  if (typeof err === 'string' && err.trim()) {
    return err;
  }
  return fallbackMessage;
}
