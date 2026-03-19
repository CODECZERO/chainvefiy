/**
 * Frontend Logger
 * Lightweight browser-compatible logger with levels and optional remote reporting.
 * Logs are written to the console in development and can be extended to send to
 * a remote endpoint in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const IS_DEV = process.env.NODE_ENV !== 'production';
const MIN_LEVEL: LogLevel = IS_DEV ? 'debug' : 'info';

// In-memory buffer for error logs (can be sent to a backend later)
const errorBuffer: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];
const MAX_BUFFER_SIZE = 50;

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return data ? `${prefix} ${message}` : `${prefix} ${message}`;
}

function addToBuffer(level: string, message: string, data?: any) {
    if (errorBuffer.length >= MAX_BUFFER_SIZE) {
        errorBuffer.shift(); // Remove oldest entry
    }
    errorBuffer.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
    });
}

export const logger = {
    debug(message: string, data?: any) {
        if (!shouldLog('debug')) return;
        console.debug(formatMessage('debug', message), data || '');
    },

    info(message: string, data?: any) {
        if (!shouldLog('info')) return;
        console.info(formatMessage('info', message), data || '');
    },

    warn(message: string, data?: any) {
        if (!shouldLog('warn')) return;
        console.warn(formatMessage('warn', message), data || '');
        addToBuffer('warn', message, data);
    },

    error(message: string, data?: any) {
        if (!shouldLog('error')) return;
        console.error(formatMessage('error', message), data || '');
        addToBuffer('error', message, data);
    },

    /** Get buffered error/warn logs (for sending to backend or displaying) */
    getErrorBuffer() {
        return [...errorBuffer];
    },

    /** Clear the error buffer */
    clearErrorBuffer() {
        errorBuffer.length = 0;
    },
};

export default logger;
