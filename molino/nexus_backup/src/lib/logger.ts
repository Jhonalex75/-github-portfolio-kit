/**
 * Centralized Logging System
 * Handles error tracking, analytics, and debugging
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: Error;
  metadata?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private enableErrorLogging = process.env.NEXT_PUBLIC_ENABLE_ERROR_LOGGING === 'true';

  /**
   * Log a message with optional context
   */
  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.write(LogLevel.INFO, message, context, undefined, metadata);
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: string, metadata?: Record<string, any>) {
    if (this.isDevelopment) {
      this.write(LogLevel.DEBUG, message, context, undefined, metadata);
    }
  }

  /**
   * Log warning
   */
  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.write(LogLevel.WARNING, message, context, undefined, metadata);
  }

  /**
   * Log error with exception
   */
  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>) {
    this.write(LogLevel.ERROR, message, context, error, metadata);
    this.sendToErrorService(message, error, context);
  }

  /**
   * Log critical error
   */
  critical(message: string, error?: Error, context?: string, metadata?: Record<string, any>) {
    this.write(LogLevel.CRITICAL, message, context, error, metadata);
    this.sendToErrorService(message, error, context);
  }

  /**
   * Internal write method
   */
  private write(
    level: LogLevel,
    message: string,
    context?: string,
    error?: Error,
    metadata?: Record<string, any>
  ) {
    const entry: LogEntry = {
      level,
      message,
      context,
      error,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Console output in development
    if (this.isDevelopment) {
      const colorMap = {
        [LogLevel.DEBUG]: 'color: #999',
        [LogLevel.INFO]: 'color: #00E5FF',
        [LogLevel.WARNING]: 'color: #FFB800',
        [LogLevel.ERROR]: 'color: #FF6B6B',
        [LogLevel.CRITICAL]: 'color: #FF0000; font-weight: bold',
      };

      const logFn = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.log,
        [LogLevel.WARNING]: console.warn,
        [LogLevel.ERROR]: console.error,
        [LogLevel.CRITICAL]: console.error,
      }[level];

      logFn(`%c[${level.toUpperCase()}] ${context || 'App'}`, colorMap[level]);
      logFn(message);
      if (metadata) logFn('Metadata:', metadata);
      if (error) logFn('Error:', error);
    }

    // Send to external service in production
    if (!this.isDevelopment && this.enableErrorLogging) {
      this.sendToAnalytics(entry);
    }
  }

  /**
   * Send to Sentry or other error service
   */
  private sendToErrorService(message: string, error?: Error, context?: string) {
    if (typeof window === 'undefined') return; // Server-side

    // Check if Sentry is available
    if ('__SENTRY_RELEASE__' in window || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // This would be replaced with actual Sentry integration
        const errorData = {
          message,
          error: error?.message,
          stack: error?.stack,
          context,
          url: window.location.href,
        };

        // Log to console for now, integrate Sentry later
        if (!this.isDevelopment) {
          console.log('[Error Service]', errorData);
        }
      } catch (e) {
        console.error('Failed to send error to service:', e);
      }
    }
  }

  /**
   * Send to analytics service
   */
  private sendToAnalytics(entry: LogEntry) {
    // Placeholder for analytics integration
    // Can be connected to Google Analytics, Mixpanel, etc.
  }
}

// Export singleton instance
export const logger = new Logger();
