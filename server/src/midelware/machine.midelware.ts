import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../util/apiError.util.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

export interface MachineRequest extends Request {
  machineScanner?: {
    id: string;
    name: string;
    deviceModel: string | null;
    supplierId: string | null;
    fixedLat: number | null;
    fixedLng: number | null;
    fixedLocation: string | null;
    fixedCountry: string | null;
  };
}

export const verifyMachineApiKey = async (
  req: MachineRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawKey =
      (req.headers['x-machine-api-key'] as string) ||
      (req.query.api_key as string);

    if (!rawKey) throw new ApiError(401, 'Machine API key required');

    // Hash before DB lookup — plaintext keys are never stored
    const hashedKey = createHash('sha256').update(rawKey).digest('hex');

    // Redis rate-limit: max 10 requests/sec per machine key
    const rateLimitKey = `machine:rate:${hashedKey}:${Math.floor(Date.now() / 1000)}`;
    const currentCount = await cacheGet<number>(rateLimitKey);
    if (currentCount && currentCount >= 10) {
      return res.status(429).json({ success: false, message: 'Rate limit exceeded (10 req/s)' });
    }
    await cacheSet(rateLimitKey, (currentCount || 0) + 1, 2);

    // Cache machine lookup to avoid DB hit on every scan
    const cacheKey = `machine:${hashedKey}`;
    let machine = await cacheGet<MachineRequest['machineScanner']>(cacheKey);

    if (!machine) {
      const dbMachine = await prisma.machineScanner.findUnique({
        where: { apiKey: hashedKey, isActive: true },
        select: {
          id: true,
          name: true,
          deviceModel: true,
          supplierId: true,
          fixedLat: true,
          fixedLng: true,
          fixedLocation: true,
          fixedCountry: true,
        },
      });

      if (!dbMachine) throw new ApiError(401, 'Invalid or inactive machine API key');

      machine = dbMachine;
      await cacheSet(cacheKey, machine, 600); // cache 10 minutes
    }

    req.machineScanner = machine;
    return next();
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    return res.status(401).json({ success: false, message: 'Machine auth failed' });
  }
};
