const TIMEZONE = "Asia/Kolkata";

export function getNowIST(): Date {
  // Native Date always stores UTC internally; formatting below forces IST.
  return new Date();
}

export function formatDateIST(
  dateInput?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(d);
}

export function formatDateTimeIST(
  dateInput?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(d);
}

export function formatTimeIST(dateInput?: string | number | Date | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDateInputIST(dateInput: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateInput);
}

/* ------------------------------------------------------------------ */
/*  IST-aware month-boundary helpers (replace startOfMonth / endOfMonth) */
/* ------------------------------------------------------------------ */

/** Extract the IST year–month as `"YYYY"` / `"MM"` / `"DD"` parts. */
function toISTParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [y, m, d] = parts.split("-").map(Number);
  return { y, m, d };
}

/** Returns a Date representing the very first instant of the IST month that contains `date` (IST midnight → UTC instant). */
export function getISTMonthStart(date: Date = new Date()): Date {
  const { y, m } = toISTParts(date);
  return new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+05:30`);
}

/** Returns a Date representing the very last millisecond of the IST month that contains `date`. */
export function getISTMonthEnd(date: Date = new Date()): Date {
  const { y, m } = toISTParts(date);
  // Compute next IST month's first instant, then subtract 1 ms.
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const nextMonthStart = new Date(
    `${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00+05:30`,
  );
  return new Date(nextMonthStart.getTime() - 1);
}

export default {
  getNowIST,
  formatDateIST,
  formatDateTimeIST,
  formatTimeIST,
  formatDateInputIST,
  getISTMonthStart,
  getISTMonthEnd,
};
