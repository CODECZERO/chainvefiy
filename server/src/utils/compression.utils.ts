import { ZstdCodec } from 'zstd-codec';

let zstdInstance: any = null;

async function getZstd() {
    if (!zstdInstance) {
        zstdInstance = await new Promise((resolve) => {
            ZstdCodec.run((zstd: any) => resolve(new zstd.Simple()));
        });
    }
    return zstdInstance;
}

export interface CompressResult {
    buffer: Buffer;
    originalSize: number;
    compressedSize: number;
}

export interface DecompressResult {
    data: any;
    compressedSize: number;
    decompressedSize: number;
}

/**
 * Compresses an object into a Zstandard buffer.
 * Returns buffer + size metrics for logging.
 */
export async function compressData(data: any): Promise<CompressResult> {
    const zstd = await getZstd();
    const jsonStr = JSON.stringify(data);
    const input = Buffer.from(jsonStr);
    const compressed = zstd.compress(input);
    const compressedBuf = Buffer.from(compressed);
    return {
        buffer: compressedBuf,
        originalSize: input.length,
        compressedSize: compressedBuf.length,
    };
}

/**
 * Decompresses a Zstandard buffer back into an object.
 * Returns parsed data + size metrics for logging.
 */
export async function decompressData(compressed: Buffer): Promise<DecompressResult> {
    const zstd = await getZstd();
    const decompressed = zstd.decompress(compressed);
    const decompressedBuf = Buffer.from(decompressed);
    const jsonStr = decompressedBuf.toString();
    return {
        data: JSON.parse(jsonStr),
        compressedSize: compressed.length,
        decompressedSize: decompressedBuf.length,
    };
}

