// ─── Application Error Taxonomy ──────────────────────────────────────────────
// Typed error classes with HTTP status codes for consistent server-action
// and API-route error handling across the VitalSync codebase.
//
// Usage:
//   throw new ConflictError("This appointment slot is already booked.");
//   throw new InvariantViolationError("Appointment cannot be in the past.");
//   throw new UnauthorizedError("You do not have permission to access this resource.");
//   throw new DatabaseError("Failed to query invoices", originalError);
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Base application error. All custom errors extend this class so that
 * server actions and API routes can catch a single type and read `.statusCode`.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

/**
 * 403 — The authenticated user lacks the required role or permission.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403);
    this.name = "UnauthorizedError";
  }
}

/**
 * 409 — A conflicting resource already exists (e.g. duplicate booking).
 */
export class ConflictError extends AppError {
  constructor(message = "The requested operation conflicts with an existing resource.") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * 422 — A business-rule / invariant violation (e.g. appointment in the past).
 */
export class InvariantViolationError extends AppError {
  constructor(message = "The request violates a business rule.") {
    super(message, 422);
    this.name = "InvariantViolationError";
  }
}

/**
 * 500 — A database or Supabase query failure. Wraps the original cause
 * so the root error is preserved for logging while presenting a safe
 * message to callers.
 */
export class DatabaseError extends AppError {
  constructor(message = "A database error occurred. Please try again.", options?: ErrorOptions) {
    super(message, 500, options);
    this.name = "DatabaseError";
  }
}


// ─── Postgres / Supabase Error Mapping ──────────────────────────────────────
// Translates raw PostgrestError codes into human-friendly, safe messages so
// callers never surface raw SQL details to the UI. Import `getUserFacingMessage`
// (or `toDatabaseError`) anywhere a Supabase query can fail and present the
// mapped message instead of the raw `error.message`.

export interface PostgrestErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/** Deterministic, human-readable message per well-known Postgres error code. */
const PG_ERROR_MESSAGES: Record<string, string> = {
  "23505": "A record with this identifier already exists.",
  "23503": "This record is referenced by other data and cannot be changed.",
  "23502": "A required value is missing for this record.",
  "23514": "One of the values violates a database check constraint.",
  "42501": "You do not have permission to perform this action.",
  "PGRST116": "The requested record was not found.",
  "PGRST301": "A database privilege is preventing this action.",
  "PGRST204": "The requested record was not found.",
  "22P02": "The identifier supplied is not valid.",
  "42P01": "The requested table is not available. Contact support.",
};

function isPostgrestError(value: unknown): value is PostgrestErrorLike {
  return (
    !!value &&
    typeof value === "object" &&
    ("message" in value || "code" in value)
  );
}

/**
 * Map a Supabase/Postgres error object to a safe, user-facing message.
 * Falls back to the original message for unrecognised codes (so no
 * information is lost), but never exposes raw `details`/`hint` by default.
 */
export function getUserFacingMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!isPostgrestError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const explicit = PG_ERROR_MESSAGES[error.code ?? ""];
  if (explicit) return explicit;

  return error.message?.trim() ? error.message : fallback;
}

/**
 * Convenience guard so arbitrary insert/update errors are translated before
 * being thrown as a DatabaseError. Returns null when there was no error.
 */
export function toDatabaseError(
  error: unknown,
  message = "A database error occurred. Please try again."
): DatabaseError | null {
  if (!error) return null;
  return new DatabaseError(getUserFacingMessage(error, message), { cause: error });
}
