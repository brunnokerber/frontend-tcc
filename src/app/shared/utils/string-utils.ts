/**
 * Sanitiza valores de texto: remove espaços das pontas e converte strings vazias para null.
 */
export function sanitize(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Converte um valor (Date ou string) para o formato ISO 'yyyy-MM-dd' ou null.
 */
export function dateToIsoString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof val === 'string' && val.trim()) {
    const trimmed = val.trim();
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    return trimmed.split('T')[0];
  }
  return null;
}

/**
 * Retorna a data de hoje no formato ISO 'yyyy-MM-dd' respeitando o fuso horário local.
 */
export function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma string ISO 'yyyy-MM-dd' em um objeto Date do JavaScript ou null no fuso local.
 */
export function parseIsoToDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Remove todos os caracteres não numéricos.
 */
export function onlyDigits(val?: string | null): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

/**
 * Formata um número de telefone com DDD (10 ou 11 dígitos).
 */
export function formatPhone(val?: string | null): string {
  if (!val) return '';
  const digits = onlyDigits(val);
  if (digits.length === 11) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  }
  return val;
}

/**
 * Formata um CEP (8 dígitos: 00000-000).
 */
export function formatCep(val?: string | null): string {
  if (!val) return '';
  const digits = onlyDigits(val);
  if (digits.length === 8) {
    return `${digits.substring(0, 5)}-${digits.substring(5)}`;
  }
  return val;
}

