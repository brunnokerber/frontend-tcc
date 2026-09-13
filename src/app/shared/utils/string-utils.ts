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
    return val.split('T')[0];
  }
  return null;
}

/**
 * Converte uma string ISO 'yyyy-MM-dd' em um objeto Date do JavaScript ou null.
 */
export function parseIsoToDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

