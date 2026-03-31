import { Request, Response } from 'express';
import { asyncHandler } from '../util/asyncHandler.util.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { loginUser } from '../dbQueries/user.Queries.js';
import { createAccount } from '../services/stellar/account.stellar.js';
import logger from '../util/logger.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface userSingupData {
  email: string;
  password: string;
  name?: string;
  whatsappNumber?: string;
  role?: 'SUPPLIER' | 'BUYER' | 'VERIFIER';
  location?: string;
  category?: string;
}

export interface userLoginData {
  email: string;
  password: string;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ─── REGISTER ───────────────────────────────────────────────────────
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, whatsappNumber, role, location, category } = req.body as userSingupData;
  if (!email || !password) throw new ApiError(400, 'Email and password required');
  if (role === 'SUPPLIER' && (!name || !whatsappNumber)) {
    throw new ApiError(400, 'Name and WhatsApp number are required for suppliers');
  }

  // Early exit: Check if email or WhatsApp is already taken before wasting 30s creating a Stellar wallet
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        whatsappNumber ? { whatsappNumber } : {}
      ].filter(o => Object.keys(o).length > 0)
    },
    select: { email: true, whatsappNumber: true }
  });
  
  if (existingUser) {
    if (existingUser.email?.toLowerCase() === email.toLowerCase()) {
      throw new ApiError(409, 'Email already registered');
    }
    if (whatsappNumber && existingUser.whatsappNumber === whatsappNumber) {
      throw new ApiError(409, 'WhatsApp number already registered');
    }
  }

  // 1. Hash password early (CPU intensive, do it before the 30s wait)
  const passwordHash = await bcrypt.hash(password, 10);

  // 2. Create Stellar wallet (Before opening any DB connections)
  // This takes 15-30 seconds but doesn't touch the DB
  let stellarWallet: string | undefined;
  let stellarSecret: string | undefined;
  try {
    const account = await createAccount();
    stellarWallet = account?.publicKey;
    stellarSecret = account?.secret;
  } catch (e) {
    logger.warn('Stellar wallet creation failed, proceeding without wallet', { error: e });
  }

  // 3. Now save everything with a robust retry for connection terminations
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
    try {
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          stellarWallet,
          managedSecret: stellarSecret,
          whatsappNumber,
          role: role || 'BUYER',
          ...(role === 'SUPPLIER' && name && whatsappNumber ? {
            supplierProfile: {
              create: {
                name,
                location,
                category,
                stellarWallet,
                managedSecret: stellarSecret,
                whatsappNumber,
              }
            }
          } : {})
        },
        include: { supplierProfile: true }
      });

      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.ATS as string,
        { expiresIn: (process.env.ATE as any) || '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.RTS as string,
        { expiresIn: (process.env.RTE as any) || '7d' }
      );

      return res
        .cookie('accessToken', accessToken, COOKIE_OPTIONS)
        .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
        .status(201)
        .json(new ApiResponse(201, {
          user: { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            isVerified: (user as any).isVerified, 
            stellarWallet, 
            supplierProfile: (user as any).supplierProfile 
          },
          accessToken,
        }, 'Registration successful'));

    } catch (error: any) {
      attempts++;
      const isConnectionError = error?.message?.includes('Connection terminated') || error?.message?.includes('timeout');
      
      if (isConnectionError && attempts < maxAttempts) {
        logger.warn(`DB connection dropped at attempt ${attempts}, retrying with brand new socket...`);
        await new Promise(r => setTimeout(r, 500)); 
        continue;
      }

      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        if (target.includes('whatsappNumber')) {
          throw new ApiError(409, 'WhatsApp number already registered');
        }
        throw new ApiError(409, 'Email or identifier already registered');
      }
      throw error;
    }
  }
  
  throw new ApiError(500, 'Registration failed unexpectedly');
});

// ─── LOGIN ──────────────────────────────────────────────────────────
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as userLoginData;
  if (!email || !password) throw new ApiError(400, 'Email and password required');

  const { user, accessToken, refreshToken } = await loginUser(email, password);

  res
    .cookie('accessToken', accessToken, COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .json(new ApiResponse(200, {
      user: {
        id: user.id, 
        email: user.email, 
        role: user.role, 
        isVerified: (user as any).isVerified,
        stellarWallet: user.stellarWallet, 
        supplierProfile: (user as any).supplierProfile 
      },
      accessToken,
    }, 'Login successful'));
});

// ─── LOGOUT ─────────────────────────────────────────────────────────
export const logout = asyncHandler(async (req: Request, res: Response) => {
  res
    .clearCookie('accessToken')
    .clearCookie('refreshToken')
    .json(new ApiResponse(200, null, 'Logged out'));
});

// ─── GET CURRENT USER ───────────────────────────────────────────────
export const getMe = asyncHandler(async (req: any, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    include: { supplierProfile: true },
  });
  if (!user) throw new ApiError(404, 'User not found');
  res.json(new ApiResponse(200, user, 'User fetched'));
});

// ─── GET SUPPLIER ORDERS (Customer Manager) ────────────────────────
export const getSupplierOrders = asyncHandler(async (req: any, res: Response) => {
  // Find the supplier profile for this user
  const supplierProfile = await prisma.supplier.findUnique({
    where: { userId: req.user?.id }
  });
  
  if (!supplierProfile) throw new ApiError(403, 'Not a supplier');

  // Find all orders for products owned by this supplier
  const orders = await prisma.order.findMany({
    where: {
      product: {
        supplierId: supplierProfile.id
      }
    },
    include: {
      product: {
        select: {
          title: true,
          priceInr: true,
          priceUsdc: true
        }
      },
      buyer: {
        select: {
          id: true,
          email: true,
          stellarWallet: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return res.json(new ApiResponse(200, orders, 'Supplier orders fetched'));
});
