import { Request, Response, NextFunction } from 'express';
import { ApiError } from './apiError.util.js';
import logger from './logger.js';

const AsyncHandler = (
  requestHandler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error: any) => {
      if (error instanceof ApiError) {
        if (error.statusCode >= 500) {
          logger.error('AsyncHandler', { message: error.message, stack: error.stack, url: req.originalUrl });
        } else {
          logger.warn('Client error', { statusCode: error.statusCode, message: error.message, url: req.originalUrl });
        }
        return next(error);
      }
      logger.error('Unhandled error in AsyncHandler', { message: error?.message, stack: error?.stack, url: req.originalUrl });
      next(new ApiError(500, 'Internal Server Error'));
    });
  };
};

export default AsyncHandler;

// Named export alias for new routes
export { AsyncHandler as asyncHandler };
