console.log('--- STARTING PRAMANIK SERVER ---');
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); // CRITICAL: Fixes Supabase 20-second IPv6 hangs in Node >17

import app from './app.js';
import { connectDB } from './util/appStartup.util.js';
import { prisma } from './lib/prisma.js';
import logger from './util/logger.js';
import { connectRedis, redisClient } from './util/redis.util.js';
import { startAnchorJob } from './jobs/anchorQueue.job.js';
import { startDeliveryAutoCompleteJob } from './jobs/deliveryAutoComplete.job.js';

const PORT = process.env.PORT || 8000;

const start = async () => {
  try {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`Pramanik server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`WhatsApp webhook: POST /api/whatsapp/webhook`);

      // Start background jobs
      if (process.env.NODE_ENV !== 'test') {
        startAnchorJob();
        startDeliveryAutoCompleteJob();
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  if (redisClient && (redisClient as any).isOpen) await (redisClient as any).disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  if (redisClient && (redisClient as any).isOpen) await (redisClient as any).disconnect();
  process.exit(0);
});

start();
