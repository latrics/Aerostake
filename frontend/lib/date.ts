/**
 * Global date formatting utilities for Aerostake / Latrics.
 * Standard format across entire application: DD-MM-YYYY (e.g. "12-10-2026")
 */

/**
 * Formats a date value into dd-mm-yyyy format.
 * Gracefully handles ISO strings, Date objects, timestamps, and YYYY-MM-DD strings.
 */
export function formatDateDDMMYYYY(dateVal?: string | number | Date | null, fallback = '—'): string {
  if (!dateVal) return fallback;

  // Handle YYYY-MM-DD directly without timezone shift
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}-${m}-${y}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/');
      return `${d}-${m}-${y}`;
    }
  }

  try {
    const d = typeof dateVal === 'string' || typeof dateVal === 'number' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats a date value into dd-mm-yyyy HH:mm format.
 */
export function formatDateTimeDDMMYYYY(dateVal?: string | number | Date | null, fallback = '—'): string {
  if (!dateVal) return fallback;

  try {
    const d = typeof dateVal === 'string' || typeof dateVal === 'number' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch {
    return fallback;
  }
}
