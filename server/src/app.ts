import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './util/appStartup.util.js';
import routes from './routes/index.routes.js';
import logger, { httpLogger } from './util/logger.js';

// Load environment variables
dotenv.config();

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(origin => {
    // Trim whitespace and trailing slashes to prevent common CORS mismatches
    return origin.trim().replace(/\/$/, "");
  })
  : ['http://localhost:3000'];

// Log allowed origins for debugging
logger.info(`[CORS] Allowed Origins: ${allowedOrigins.join(", ")}`);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "https://va.vercel-scripts.com"],
        "connect-src": ["'self'", "http://localhost:8000", "http://127.0.0.1:8000", "https://va.vercel-scripts.com", "*.stellar.org", "*.soroban.org", "https://*.onrender.com"],
      },
    },
  })
);

// HTTP request logging via winston
app.use(httpLogger);

// Custom JSON parser with better error handling
app.use((req, res, next) => {
  // Skip JSON parsing for multipart/form-data requests (file uploads)
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }

  express.json({
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
      try {
        JSON.parse(buf.toString());
      } catch (err) {
        logger.error('JSON Parse Error', { error: err.message, url: req.url, body: buf.toString().substring(0, 200) });
        const error = new Error('Invalid JSON format');
        (error as any).statusCode = 400;
        throw error;
      }
    },
  })(req, res, next);
});

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Pramanik API is active',
    project: 'Pramanik — Verified Marketplace on Stellar',
    version: '2.0.0'
  });
});

app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Test-only: delay endpoint for server-close / in-flight tests (no response loss under load)
if (process.env.NODE_ENV === 'test') {
  app.get('/api/test/delay', (req, res) => {
    const ms = Math.min(parseInt(String(req.query.ms), 10) || 50, 500);
    setTimeout(() => res.json({ success: true, delayed: ms }), ms);
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack, url: req.originalUrl, method: req.method });

  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Bad Request',
    });
  }

  // Handle ApiError instances
  if (err.statusCode && err.message) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Handle other errors
  return res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    diagnostic: process.env.NODE_ENV !== 'production' ? {
      url: req.originalUrl,
      method: req.method,
      error: err.message
    } : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Connect to database only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

export default app;
