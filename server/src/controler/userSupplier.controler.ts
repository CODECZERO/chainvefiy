import { Request, Response } from 'express';
import { asyncHandler } from '../util/asyncHandler.util.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { saveUserAndTokens, loginUser } from '../dbQueries/user.Queries.js';
import { registerSupplier } from '../dbQueries/supplier.Queries.js';
import { createAccount } from '../services/stellar/account.stellar.js';
import logger from '../util/logger.js';

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

  // Create Stellar wallet for supplier/buyer
  let stellarWallet: string | undefined;
  try {
    const account = await createAccount();
    stellarWallet = account?.publicKey;
  } catch (e) {
    logger.warn('Stellar wallet creation failed, proceeding without wallet', { error: e });
  }

  const { user, accessToken, refreshToken } = await saveUserAndTokens({
    email,
    password,
    stellarWallet,
    whatsappNumber,
    role: role || 'BUYER',
  });

  // If registering as supplier, create supplier profile
  let supplierProfile: any;
  if (role === 'SUPPLIER' && name && whatsappNumber) {
    supplierProfile = await registerSupplier({
      userId: user.id,
      name,
      location,
      category,
      stellarWallet,
      whatsappNumber,
    });
  }

  res
    .cookie('accessToken', accessToken, COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .status(201)
    .json(new ApiResponse(201, {
      user: { id: user.id, email: user.email, role: user.role, isVerified: (user as any).isVerified, stellarWallet, supplierProfile },
      accessToken,
    }, 'Registration successful'));
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
  const { prisma } = await import('../lib/prisma.js');
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    include: { supplierProfile: true },
  });
  if (!user) throw new ApiError(404, 'User not found');
  res.json(new ApiResponse(200, user, 'User fetched'));
});

// ─── GET SUPPLIER ORDERS (Customer Manager) ────────────────────────
export const getSupplierOrders = asyncHandler(async (req: any, res: Response) => {
  const { prisma } = await import('../lib/prisma.js');
  
  // Find the supplier profile for this user
  const supplierProfile = await prisma.supplier.findUnique({
    where: { userId: req.user?.id }
  });
  
  if (!supplierProfile) throw new ApiError(403, 'Not a supplier');

  // Find all orders for products owned by this supplier
  // Orders are linked to products which are linked to suppliers
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

  res.json(new ApiResponse(200, orders, 'Supplier orders fetched'));
});
