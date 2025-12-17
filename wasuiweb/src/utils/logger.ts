/**
 * Logging utility for consistent error tracking
 * Prepares for future Sentry integration
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
    user?: string;
    action?: string;
    component?: string;
    [key: string]: any;
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }

    info(message: string, context?: LogContext): void {
        const formatted = this.formatMessage('info', message, context);
        console.log(formatted);
    }

    warn(message: string, context?: LogContext): void {
        const formatted = this.formatMessage('warn', message, context);
        console.warn(formatted);
    }

    error(message: string, error?: Error, context?: LogContext): void {
        const formatted = this.formatMessage('error', message, context);
        console.error(formatted);

        if (error) {
            console.error('Error details:', error);
            if (this.isDevelopment) {
                console.error('Stack trace:', error.stack);
            }
        }

        // TODO: Send to Sentry in production
        // if (!this.isDevelopment && window.Sentry) {
        //   window.Sentry.captureException(error, { extra: context });
        // }
    }

    debug(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            const formatted = this.formatMessage('debug', message, context);
            console.debug(formatted);
        }
    }

    // Track user actions for debugging
    trackAction(action: string, details?: Record<string, any>): void {
        this.info(`User action: ${action}`, { action, ...details });
    }

    // Track performance
    trackPerformance(metric: string, duration: number): void {
        this.debug(`Performance: ${metric}`, { metric, duration: `${duration}ms` });
    }
}

// Export singleton instance
export const logger = new Logger();

// Helper for try-catch blocks
export function logError(message: string, error: unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(message, err, context);
}
