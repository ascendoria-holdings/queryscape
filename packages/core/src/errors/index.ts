/**
 * Typed error hierarchy for Queryscape
 */

/** Base error class for all Queryscape errors */
export abstract class QueryscapeError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/** Connection-related errors */
export class ConnectionError extends QueryscapeError {
  public readonly code = "CONNECTION_ERROR";

  constructor(
    message: string,
    public readonly host?: string,
    public readonly port?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Authentication errors */
export class AuthError extends QueryscapeError {
  public readonly code = "AUTH_ERROR";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Rate limiting errors */
export class RateLimitError extends QueryscapeError {
  public readonly code = "RATE_LIMIT_ERROR";

  constructor(
    message: string,
    public readonly retryAfterMs?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Query-related errors */
export class QueryError extends QueryscapeError {
  public readonly code = "QUERY_ERROR";

  constructor(
    message: string,
    public readonly queryType?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Query not supported by connector */
export class QueryNotSupportedError extends QueryscapeError {
  public readonly code = "QUERY_NOT_SUPPORTED";

  constructor(
    message: string,
    public readonly capability?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Limit exceeded errors */
export class LimitExceededError extends QueryscapeError {
  public readonly code = "LIMIT_EXCEEDED";

  constructor(
    message: string,
    public readonly limitType: string,
    public readonly currentValue: number,
    public readonly maxValue: number,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Validation errors */
export class ValidationError extends QueryscapeError {
  public readonly code = "VALIDATION_ERROR";

  constructor(
    message: string,
    public readonly field?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Configuration errors */
export class ConfigError extends QueryscapeError {
  public readonly code = "CONFIG_ERROR";

  constructor(
    message: string,
    public readonly configKey?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Accelerator (Rust sidecar) errors */
export class AcceleratorError extends QueryscapeError {
  public readonly code: string = "ACCELERATOR_ERROR";

  constructor(
    message: string,
    public readonly operation?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/** Accelerator not available */
export class AcceleratorUnavailableError extends AcceleratorError {
  public override readonly code: string = "ACCELERATOR_UNAVAILABLE";

  constructor(message: string, options?: ErrorOptions) {
    super(message, undefined, options);
  }
}

/** Type guard for QueryscapeError */
export function isQueryscapeError(error: unknown): error is QueryscapeError {
  return error instanceof QueryscapeError;
}

/** Get error code safely */
export function getErrorCode(error: unknown): string {
  if (isQueryscapeError(error)) {
    return error.code;
  }
  return "UNKNOWN_ERROR";
}
