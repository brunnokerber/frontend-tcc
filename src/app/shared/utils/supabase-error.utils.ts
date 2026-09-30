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
  error: any,
  fallbackMessage = 'Erro ao processar solicitação no servidor.'
): Promise<FunctionErrorResponse> {
  if (!error) {
    return { message: fallbackMessage };
  }

  // 1. Supabase JS SDK: FunctionsHttpError (corpo da resposta dentro de error.context)
  if (error.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json();
      return {
        message: body.message || body.error || fallbackMessage,
        error: body.error || body.message || fallbackMessage,
        code: body.code,
      };
    } catch {
      // Ignora caso o stream de resposta já tenha sido lido ou não seja JSON
    }
  }

  // 2. Angular HttpClient: HttpErrorResponse (corpo já parseado em error.error)
  if (error.error && typeof error.error === 'object') {
    return {
      message: error.error.message || error.error.error || fallbackMessage,
      error: error.error.error || error.error.message || fallbackMessage,
      code: error.error.code,
    };
  }

  // 3. Objeto de erro padrão ou string simples
  const msg =
    error.message && error.message !== 'Edge Function returned a non-2xx status code'
      ? error.message
      : fallbackMessage;

  return {
    message: msg,
    error: msg,
    code: error.code,
  };
}

/**
 * Helper de conveniência que retorna diretamente a mensagem amigável de erro em string.
 */
export async function extractFunctionErrorMessage(
  error: any,
  fallbackMessage = 'Erro ao processar solicitação no servidor.'
): Promise<string> {
  const parsed = await parseFunctionError(error, fallbackMessage);
  return parsed.message;
}
