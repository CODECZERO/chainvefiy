import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../util/apiError.util.js';
import dotenv from 'dotenv';
dotenv.config();

export interface RequestK extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    stellarWallet?: string;
  };
}

export const verifyToken = async (req: RequestK, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new ApiError(401, 'Access token required');
    if (!process.env.ATS) throw new ApiError(500, 'JWT secret not configured');

    const decoded = jwt.verify(token, process.env.ATS) as any;
    if (!decoded?.id) throw new ApiError(401, 'Invalid token');

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Alias for named export used in routes
export const verifyJWT = verifyToken;

/**
 * Optional JWT: Attaches req.user if a valid token is present,
 * but does NOT block the request if no token is provided.
 * Use this for endpoints that support both JWT-auth and wallet-only users.
 */
export const optionalJWT = async (req: RequestK, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (token && process.env.ATS) {
      const decoded = jwt.verify(token, process.env.ATS) as any;
      if (decoded?.id) {
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      }
    }
  } catch {
    // Token invalid/expired — silently continue as unauthenticated
  }
  return next();
};
