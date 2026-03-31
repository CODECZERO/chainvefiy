import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from '../util/apiError.util.js';

interface FindUserInput {
  email?: string;
  id?: string;
  whatsappNumber?: string;
}

export const findUser = async (input: FindUserInput) => {
  if (!input.email && !input.id && !input.whatsappNumber)
    throw new ApiError(400, 'Provide email, id, or whatsappNumber');

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        input.email ? { email: input.email } : {},
        input.id ? { id: input.id } : {},
        input.whatsappNumber ? { whatsappNumber: input.whatsappNumber } : {},
      ].filter(o => Object.keys(o).length > 0),
    },
    include: { supplierProfile: true },
  });

  return user ? [user] : [];
};

export const saveUserAndTokens = async (data: {
  email: string;
  password: string;
  stellarWallet?: string;
  whatsappNumber?: string;
  role?: 'SUPPLIER' | 'BUYER' | 'VERIFIER';
}) => {
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        stellarWallet: data.stellarWallet,
        whatsappNumber: data.whatsappNumber,
        role: data.role || 'BUYER',
      },
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

    return { user, accessToken, refreshToken };
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'Email already registered');
    }
    throw error;
  }
};

export const loginUser = async (identifier: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { whatsappNumber: identifier }
      ]
    },
    include: { supplierProfile: true }
  });
  if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid email or password');

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

  return { user, accessToken, refreshToken };
};

export const getPrivateKey = async (productId: string): Promise<string> => {
  // Stellar private key storage is not done via DB for security
  // Return empty — actual signing done client-side via wallet
  throw new Error('Private key not stored server-side. Use client wallet for signing.');
};
