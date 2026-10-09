/**
 * Utility functions for text processing, Unicode NFC normalization, and formatting
 */

/**
 * Chuẩn hóa chuỗi hoặc object sang Unicode chuẩn Dựng sẵn (NFC - Normalization Form C).
 * Giúp khắc phục 100% lỗi tiếng Việt bị tách rời dấu (ví dụ: "CÂ`N THƠ", "Phâ`n mê`m", "tâ`ng")
 * xảy ra khi người dùng gõ bằng UniKey bộ mã "Unicode Tổ hợp" (NFD) hoặc copy từ file cũ.
 */
export function normalizeNFC<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return (input as string).normalize('NFC') as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => normalizeNFC(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = typeof key === 'string' ? key.normalize('NFC') : key;
      result[normalizedKey] = normalizeNFC(value);
    }
    return result as T;
  }

  return input;
}

/**
 * Format an ISO date string or timestamp to Vietnamese standard date (dd/mm/yyyy)
 */
export function formatDateVN(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString();
  return `${day}/${month}/${year}`;
}
