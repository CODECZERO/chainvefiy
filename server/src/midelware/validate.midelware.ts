import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import logger from '../util/logger.js';

export const validate = (schema: z.ZodObject<any, any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                logger.warn('Validation error', { issues: error.issues, url: req.originalUrl });
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.issues.map((err: any) => ({
                        path: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            return next(error);
        }
    };
};
