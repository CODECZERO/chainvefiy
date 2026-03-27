import { prisma } from '../lib/prisma.js';

export const getBuyerProfileByUserId = async (userId: string) => {
  return await prisma.buyerProfile.findUnique({
    where: { userId },
  });
};

export const updateBuyerProfileQuery = async (userId: string, data: {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}) => {
  return await prisma.buyerProfile.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
};

export const findOrCreateUserByWallet = async (stellarWallet: string) => {
  return await prisma.user.upsert({
    where: { stellarWallet },
    update: {},
    create: {
      stellarWallet,
      role: 'BUYER',
    },
  });
};
