// Error model mirrors the platform backend: every failure is
// `{ error: { code, message, details? } }` (middleware/error.ts), 500 -> INTERNAL_ERROR.
// We map HTTP status -> a typed exception while preserving the backend `code` + `details`.

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export class TermixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class TermixApiError extends TermixError {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class AuthError extends TermixApiError {}
export class ValidationError extends TermixApiError {}
export class NotFoundError extends TermixApiError {}
export class ConflictError extends TermixApiError {}
export class RateLimitError extends TermixApiError {}
export class ServerError extends TermixApiError {}

export class NetworkError extends TermixError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ChainError extends TermixError {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
  }
}

export function mapApiError(status: number, body: unknown): TermixApiError {
  const b = body as Partial<ApiErrorBody> | undefined;
  const code = b?.error?.code ?? (status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN");
  const message = b?.error?.message ?? `HTTP ${status}`;
  const details = b?.error?.details;
  switch (status) {
    case 400:
    case 422:
      return new ValidationError(status, code, message, details);
    case 401:
    case 403:
      return new AuthError(status, code, message, details);
    case 404:
      return new NotFoundError(status, code, message, details);
    case 409:
      return new ConflictError(status, code, message, details);
    case 429:
      return new RateLimitError(status, code, message, details);
    default:
      if (status >= 500) return new ServerError(status, code, message, details);
      return new TermixApiError(status, code, message, details);
  }
}
