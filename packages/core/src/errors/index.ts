/**
 * Typed error hierarchy for QueryScape
 */

/** Base error class for all QueryScape errors */
export abstract class QueryScapeError extends Error {
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
export class ConnectionError extends QueryScapeError {
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
export class AuthError extends QueryScapeError {
  public readonly code = "AUTH_ERROR";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Rate limiting errors */
export class RateLimitError extends QueryScapeError {
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
export class QueryError extends QueryScapeError {
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
export class QueryNotSupportedError extends QueryScapeError {
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
export class LimitExceededError extends QueryScapeError {
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
export class ValidationError extends QueryScapeError {
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
export class ConfigError extends QueryScapeError {
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
export class AcceleratorError extends QueryScapeError {
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

/** Type guard for QueryScapeError */
export function isQueryScapeError(error: unknown): error is QueryScapeError {
  return error instanceof QueryScapeError;
}

/** Get error code safely */
export function getErrorCode(error: unknown): string {
  if (isQueryScapeError(error)) {
    return error.code;
  }
  return "UNKNOWN_ERROR";
}
