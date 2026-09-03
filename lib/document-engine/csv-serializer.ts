// ─── CSV Serializer ──────────────────────────────────────────────────────────
// RFC 4180–compliant CSV generation and browser download helper.
// ──────────────────────────────────────────────────────────────────────────────

import { sanitizeCSVField } from "./formatters";

/**
 * Serialize headers and rows into a standards-compliant CSV string.
 *
 * Rules (RFC 4180):
 *  - Fields are separated by commas.
 *  - Rows are terminated by CRLF (\r\n).
 *  - Fields containing a comma, newline, or double-quote are wrapped in
 *    double-quotes; internal double-quotes are escaped by doubling them.
 *
 * @example
 *   serializeCSV(["Name", "Amount"], [["Ravi", "1,500"], ["Anil \"Doc\""]])
 *   // "Name,Amount\r\nRavi,\"1,500\"\r\n\"Anil \"\"Doc\"\"\"\r\n"
 */
export function serializeCSV(headers: string[], rows: string[][]): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.map(sanitizeCSVField).join(","));

  // Data rows
  for (const row of rows) {
    lines.push(row.map(sanitizeCSVField).join(","));
  }

  // RFC 4180 line endings
  return lines.join("\r\n") + "\r\n";
}

/**
 * Trigger a browser download for the given CSV content string.
 *
 * Creates a Blob with the correct UTF-8 text/csv MIME type and
 * programmatically clicks a temporary anchor element to initiate the download.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
