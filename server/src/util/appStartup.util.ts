import { prisma } from '../lib/prisma.js';
import logger from './logger.js';

export const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected via Prisma');
  } catch (error) {
    logger.error('PostgreSQL connection failed', { error });
    throw error; // Rethrow to fail startup if DB is down
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
};
