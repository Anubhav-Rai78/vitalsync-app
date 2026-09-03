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
