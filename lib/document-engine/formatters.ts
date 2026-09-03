// ─── Document Formatting Primitives ──────────────────────────────────────────
// Pure functions that format data for document output (PDF / CSV).
// These are intentionally separate from the UI formatters in lib/utils.ts
// and lib/date.ts — they produce ASCII-safe, print-oriented strings.
// ──────────────────────────────────────────────────────────────────────────────

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format a number as Indian Rupee currency with ASCII prefix.
 * Example: 125000 → "INR 1,25,000.00"
 */
export function formatINRAmount(amount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `INR ${formatted}`;
}

/**
 * Format a date as an IST date-only string for document headers.
 * Example: "27 Oct 2026"
 */
export function formatISTDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Format a date as an IST date+time string for document timestamps.
 * Example: "27 Oct 2026, 2:32 PM"
 */
export function formatISTDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * RFC 4180-compliant CSV field escaping.
 * Wraps in double-quotes if the value contains a comma, newline, or double-quote.
 * Internal double-quotes are escaped by doubling them.
 */
export function sanitizeCSVField(value: string): string {
  if (value === "") return "";

  // If the value contains any character that requires quoting, wrap it
  if (value.includes(",") || value.includes("\n") || value.includes("\r") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a number for CSV output (removes commas from raw numbers to avoid
 * clashing with CSV delimiters).
 */
export function formatCSVNumber(value: number): string {
  return value.toString();
}
