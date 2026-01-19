/**
 * Minimal logger interface with no-op default
 * Users can provide their own logger implementation
 */

/** Log levels */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Logger interface */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/** No-op logger (default) - produces no output */
class NoopLogger implements Logger {
  debug(_message: string, _context?: Record<string, unknown>): void {
    // Intentionally empty
  }
  info(_message: string, _context?: Record<string, unknown>): void {
    // Intentionally empty
  }
  warn(_message: string, _context?: Record<string, unknown>): void {
    // Intentionally empty
  }
  error(_message: string, _context?: Record<string, unknown>): void {
    // Intentionally empty
  }
}

/** Console logger for development */
class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: LogLevel = "info") {}

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage("info", message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, context));
    }
  }
}

/** Default no-op logger instance */
export const noopLogger: Logger = new NoopLogger();

/** Create a console logger */
export function createConsoleLogger(minLevel: LogLevel = "info"): Logger {
  return new ConsoleLogger(minLevel);
}

/** Redact sensitive fields from context */
export function redactSensitive(
  context: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "auth",
    "credential",
    "bearer",
  ];

  const redacted = { ...context };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      redacted[key] = "[REDACTED]";
    }
  }

  return redacted;
}
