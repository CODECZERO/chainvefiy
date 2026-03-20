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

    // Run pending migrations on startup (safe in production)
    try {
      await Promise.race([
        prisma.$executeRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB check timeout')), 750)),
      ]);
      logger.info('Database connection verified');
    } catch (e) {
      logger.error('Database check failed', { error: e });
    }

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
