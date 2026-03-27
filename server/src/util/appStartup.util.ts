import { prisma } from '../lib/prisma.js';
import logger from './logger.js';

export const connectDB = async () => {
  try {
    // Avoid blocking server boot if DB is unavailable locally.
    // Prisma will attempt connections on demand; endpoints can fall back as needed.
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB connect timeout')), 5000)),
    ]);
    logger.info('PostgreSQL connected via Prisma');
  } catch (error) {
    logger.error('PostgreSQL connection failed (continuing without DB)', { error });
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
};
