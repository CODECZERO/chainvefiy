import jwt from 'jsonwebtoken';
import { ApiError } from './apiError.util.js';
import dotenv from 'dotenv';
dotenv.config();

interface TokenPayload {
  email?: string;
  supplierName?: string;
  walletAddr?: string;
  id?: string;
}

// Generate Access Token
const genAccessToken = async (user: TokenPayload) => {
  try {
    const { email, walletAddr, supplierName, id } = user;
    if (!process.env.ATS) {
      throw new Error('ATS (Access Token Secret) is not defined in environment variables');
    }
    const secret: any = process.env.ATS;

    if (!secret || !user) {
      throw new ApiError(500, 'Secret is missing or user info is invalid');
    }

    return jwt.sign(
      {
        email,
        supplierName,
        walletAddr,
        id: id, // Also include id for consistency
      },
      secret, // Access token secret
      {
        expiresIn: process.env.ATE || '15m', // Access token expiry
      } as jwt.SignOptions
    );
  } catch (error) {
    throw new ApiError(500, 'Unable to generate access token');
  }
};

// Generate Refresh Token
const genRefreshToken = async (user: TokenPayload) => {
  try {
    const { id, walletAddr } = user;
    if (!process.env.RTS) {
      throw new Error('RTS (Refresh Token Secret) is not defined in environment variables');
    }
    const secret: any = process.env.RTS;

    if (!secret) {
      throw new ApiError(500, 'Refresh token secret is missing');
    }

    return jwt.sign(
      {
        id,
        walletAddr,
      },
      secret,
      {
        expiresIn: process.env.RTE || '7d', // Refresh token expiry
      } as jwt.SignOptions
    );
  } catch (error) {
    throw new ApiError(400, 'Unable to generate refresh token');
  }
};

export { genAccessToken, genRefreshToken };
