import winston from 'winston';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

/**
 * Dedicated logger for data compression metrics.
 * Tracks: original size, compressed size, ratio, and decompressed size.
 * Output: server/logs/compression.log
 */
const compressionLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, message, ...meta }) => {
            return `[${timestamp}] ${message} | ${JSON.stringify(meta)}`;
        })
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'compression.log'),
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 3,
        }),
    ],
});

export interface CompressionMetrics {
    collection: string;
    id: string;
    originalBytes: number;
    compressedBytes: number;
    ratio: string;          // e.g. "3.2x"
    savedBytes: number;
    savedPercent: string;   // e.g. "68.7%"
}

export interface DecompressionMetrics {
    collection: string;
    id: string;
    compressedBytes: number;
    decompressedBytes: number;
    ratio: string;
}

export function logCompression(metrics: CompressionMetrics) {
    compressionLogger.info('COMPRESS', {
        collection: metrics.collection,
        id: metrics.id,
        original: `${metrics.originalBytes}B`,
        compressed: `${metrics.compressedBytes}B`,
        ratio: metrics.ratio,
        saved: `${metrics.savedBytes}B (${metrics.savedPercent})`,
    });
}

export function logDecompression(metrics: DecompressionMetrics) {
    compressionLogger.info('DECOMPRESS', {
        collection: metrics.collection,
        id: metrics.id,
        compressed: `${metrics.compressedBytes}B`,
        decompressed: `${metrics.decompressedBytes}B`,
        ratio: metrics.ratio,
    });
}

export default compressionLogger;
