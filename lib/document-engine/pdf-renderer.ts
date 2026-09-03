// ─── PDF Document Renderer ───────────────────────────────────────────────────
// Thin typed wrapper around jsPDF that handles page layout, headers, tables,
// and automatic page-breaks. Keeps all jsPDF API usage in one place so
// individual pages don't need to manage cursor position or page math.
//
// Dependency: jspdf (already in package.json v4.2.1)
// ──────────────────────────────────────────────────────────────────────────────

import { jsPDF } from "jspdf";

/** Vertical position at which a new page is automatically inserted. */
const PAGE_BREAK_THRESHOLD = 275;

/** Page margins (in mm for default A4). */
const MARGIN = { top: 20, left: 15, right: 15, bottom: 20 };

// ── Types ────────────────────────────────────────────────────────────────────

export interface PDFDocumentOptions {
  orientation?: "portrait" | "landscape";
  unit?: "mm" | "pt" | "cm" | "in";
  format?: "a4" | "letter" | "legal";
}

export interface TableOptions {
  /** Font size for table body (default: 9). */
  fontSize?: number;
  /** Header row background hex colour (default: "004ac6"). */
  headerBg?: string;
  /** Header row text hex colour (default: "FFFFFF"). */
  headerColor?: string;
  /** Row height in mm (default: 8). */
  rowHeight?: number;
  /** Column widths as fractions of available width (auto-distributed if omitted). */
  columnWidths?: number[];
}

// ── Document Class ───────────────────────────────────────────────────────────

export class PDFDocument {
  private doc: jsPDF;
  private cursorY: number;
  private pageWidth: number;
  private availableWidth: number;

  constructor(options?: PDFDocumentOptions) {
    this.doc = new jsPDF({
      orientation: options?.orientation ?? "portrait",
      unit: options?.unit ?? "mm",
      format: options?.format ?? "a4",
    });
    const internal = this.doc.internal;
    this.pageWidth = internal.pageSize.getWidth();
    this.availableWidth = this.pageWidth - MARGIN.left - MARGIN.right;
    this.cursorY = MARGIN.top;
  }

  /** Access the underlying jsPDF instance for advanced usage. */
  get raw(): jsPDF { return this.doc; }

  /** Current vertical cursor position in mm. */
  get currentY(): number { return this.cursorY; }

  // ── Content Methods ──────────────────────────────────────────────────────

  /** Add a title + optional subtitle at the current cursor position. */
  addHeader(title: string, subtitle?: string): void {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title, MARGIN.left, this.cursorY);
    this.cursorY += 8;
    if (subtitle) {
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(100);
      this.doc.text(subtitle, MARGIN.left, this.cursorY);
      this.doc.setTextColor(0);
      this.cursorY += 6;
    }
    this.cursorY += 4;
  }

  /** Add a single line of text at the current cursor. */
  addText(
    text: string,
    options?: { x?: number; fontSize?: number; bold?: boolean; color?: string | [number, number, number]; align?: "left" | "right" | "center" }
  ): void {
    const fontSize = options?.fontSize ?? 10;
    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    if (options?.color) this.doc.setTextColor(...this.resolveColor(options.color));
    const align = options?.align ?? "left";
    let x = options?.x ?? MARGIN.left;
    if (align === "right") x = this.pageWidth - MARGIN.right;
    this.doc.text(text, x, this.cursorY, { align });
    this.doc.setTextColor(0);
    this.cursorY += fontSize * 0.45;
  }

  /**
   * Add a two-column row (label on the left, value right-aligned).
   * Useful for header rows / bill-to blocks.
   */
  addTwoColumn(left: string, right: string, options?: { fontSize?: number; bold?: boolean; color?: string | [number, number, number] }): void {
    const fontSize = options?.fontSize ?? 10;
    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    if (options?.color) this.doc.setTextColor(...this.resolveColor(options.color));
    this.doc.text(left, MARGIN.left, this.cursorY);
    this.doc.text(right, this.pageWidth - MARGIN.right, this.cursorY, { align: "right" });
    this.doc.setTextColor(0);
    this.cursorY += fontSize * 0.45;
  }

  /** Add a labelled + value pair on the same line (left label, inline value). */
  addLabelValue(label: string, value: string, options?: { x?: number; fontSize?: number; labelColor?: string | [number, number, number] }): void {
    const fontSize = options?.fontSize ?? 9;
    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", "normal");
    if (options?.labelColor) this.doc.setTextColor(...this.resolveColor(options.labelColor));
    this.doc.text(label, options?.x ?? MARGIN.left, this.cursorY);
    this.doc.setTextColor(0);
    this.cursorY += fontSize * 0.45;
    // value on the next line at an indent
    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(value, (options?.x ?? MARGIN.left) + 6, this.cursorY);
    this.cursorY += fontSize * 0.45;
  }

  /** Add explicit vertical whitespace at the current cursor position. */
  addSpacer(height: number): void {
    this.cursorY += height;
    this.breakPageIfOverflow(0);
  }

  /** Add a single bullet-pointed line. */
  addBullet(text: string, options?: { fontSize?: number; indent?: number }): void {
    const fontSize = options?.fontSize ?? 10;
    const indent = options?.indent ?? 4;
    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(`• ${text}`, MARGIN.left + indent, this.cursorY);
    this.cursorY += fontSize * 0.45;
  }

  /** Resolve a hex string or RGB tuple into the tuple jsPDF expects. */
  private resolveColor(color: string | [number, number, number]): [number, number, number] {
    if (Array.isArray(color)) return color;
    const hex = color.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b];
    }
    return [0, 0, 0];
  }

  /** Add a horizontal divider line. */
  addDivider(): void {
    this.breakPageIfOverflow(6);
    this.doc.setDrawColor(195, 198, 215);
    this.doc.line(MARGIN.left, this.cursorY, this.pageWidth - MARGIN.right, this.cursorY);
    this.cursorY += 6;
  }

  /**
   * Render a table with headers and rows. Automatically triggers a page break
   * when the estimated table height exceeds the remaining page space.
   */
  addTable(headers: string[], rows: string[][], options?: TableOptions): void {
    const fontSize = options?.fontSize ?? 9;
    const headerBg = options?.headerBg ?? "004ac6";
    const headerColor = options?.headerColor ?? "FFFFFF";
    const rowHeight = options?.rowHeight ?? 8;
    const colCount = headers.length;
    const colWidths =
      options?.columnWidths ??
      Array.from({ length: colCount }, () => this.availableWidth / colCount);

    // Check if header + at least one row will fit
    this.breakPageIfOverflow(rowHeight * 2);

    // ── Header row ──
    this.doc.setFillColor(headerBg);
    this.doc.rect(MARGIN.left, this.cursorY - rowHeight * 0.35, this.availableWidth, rowHeight, "F");
    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(headerColor);
    let x = MARGIN.left;
    for (let i = 0; i < colCount; i++) {
      this.doc.text(headers[i], x + 2, this.cursorY);
      x += colWidths[i];
    }
    this.cursorY += rowHeight;
    this.doc.setTextColor(0);

    // ── Data rows ──
    this.doc.setFont("helvetica", "normal");
    for (let r = 0; r < rows.length; r++) {
      this.breakPageIfOverflow(rowHeight);
      if (r % 2 === 0) {
        this.doc.setFillColor("F8FAFC");
        this.doc.rect(MARGIN.left, this.cursorY - rowHeight * 0.35, this.availableWidth, rowHeight, "F");
      }
      x = MARGIN.left;
      for (let i = 0; i < colCount; i++) {
        this.doc.text(rows[r][i] ?? "", x + 2, this.cursorY);
        x += colWidths[i];
      }
      this.cursorY += rowHeight;
    }
    this.cursorY += 4;
  }

  // ── Page Management ─────────────────────────────────────────────────────

  /**
   * Insert a new page if the estimated content height would exceed the
   * PAGE_BREAK_THRESHOLD (275 mm, leaving room for footer).
   */
  breakPageIfOverflow(estimatedHeight: number): void {
    if (this.cursorY + estimatedHeight > PAGE_BREAK_THRESHOLD) {
      this.addPage();
    }
  }

  /** Explicitly add a new page and reset cursor to the top margin. */
  addPage(): void {
    this.doc.addPage();
    this.cursorY = MARGIN.top;
  }

  // ── Output ──────────────────────────────────────────────────────────────

  /** Save the PDF to the user's downloads. */
  save(filename: string): void {
    this.doc.save(filename);
  }

  /** Get the raw PDF as a data URL (for embedding or previewing). */
  toDataURL(): string {
    return this.doc.output("dataurlstring");
  }

  /** Get the raw PDF as a Blob. */
  toBlob(): Blob {
    return this.doc.output("blob");
  }
}

