/**
 * Typed error hierarchy for QueryScape.
 * All errors extend QueryScapeError for consistent handling.
 */

export class QueryScapeError extends Error {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'QueryScapeError';
    this.code = code;
    this.timestamp = Date.now();
    this.context = context;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
    };
  }
}

/** Errors related to database connectors */
export class ConnectorError extends QueryScapeError {
  public readonly connectorType: string;

  constructor(message: string, connectorType: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTOR_ERROR', { ...context, connectorType });
    this.name = 'ConnectorError';
    this.connectorType = connectorType;
  }
}

/** Authentication/authorization errors */
export class AuthError extends QueryScapeError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', context);
    this.name = 'AuthError';
  }
}

/** Rate limit exceeded */
export class RateLimitError extends QueryScapeError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', { ...context, retryAfterMs });
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** Query type not supported by connector */
export class QueryNotSupportedError extends QueryScapeError {
  public readonly queryType: string;

  constructor(queryType: string, connectorType: string, context?: Record<string, unknown>) {
    super(
      `Query type '${queryType}' is not supported by connector '${connectorType}'`,
      'QUERY_NOT_SUPPORTED',
      { ...context, queryType, connectorType }
    );
    this.name = 'QueryNotSupportedError';
    this.queryType = queryType;
  }
}

/** Session limits exceeded (max nodes, edges, etc.) */
export class SessionLimitError extends QueryScapeError {
  public readonly limitType: string;
  public readonly limit: number;
  public readonly attempted: number;

  constructor(limitType: string, limit: number, attempted: number, context?: Record<string, unknown>) {
    super(
      `Session limit '${limitType}' exceeded: attempted ${attempted}, limit is ${limit}`,
      'SESSION_LIMIT_ERROR',
      { ...context, limitType, limit, attempted }
    );
    this.name = 'SessionLimitError';
    this.limitType = limitType;
    this.limit = limit;
    this.attempted = attempted;
  }
}

/** Validation errors for inputs */
export class ValidationError extends QueryScapeError {
  public readonly field: string;

  constructor(message: string, field: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', { ...context, field });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** Rust accelerator errors */
export class AcceleratorError extends QueryScapeError {
  public readonly operation: string;

  constructor(message: string, operation: string, context?: Record<string, unknown>) {
    super(message, 'ACCELERATOR_ERROR', { ...context, operation });
    this.name = 'AcceleratorError';
    this.operation = operation;
  }
}
