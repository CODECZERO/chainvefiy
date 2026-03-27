import { prisma } from '../lib/prisma.js';
import { BountyStatus, PaymentMethod } from '../generated/prisma/index.js';

export const createBountyQuery = async (data: {
  productId: string;
  issuerId?: string;
  issuerWallet?: string;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
}) => {
  return await prisma.bounty.create({
    data: {
      productId: data.productId,
      issuerId: data.issuerId,
      issuerWallet: data.issuerWallet,
      amount: data.amount,
      description: data.description,
      paymentMethod: data.paymentMethod || 'STELLAR_USDC',
      status: 'PENDING',
    },
  });
};

export const updateBountyStatusQuery = async (id: string, status: BountyStatus, transactionHash?: string) => {
  return await prisma.bounty.update({
    where: { id },
    data: {
      status,
      transactionHash,
    },
  });
};

export const getBountiesByProductQuery = async (productId: string) => {
  return await prisma.bounty.findMany({
    where: { productId },
    include: {
      issuer: { select: { email: true, stellarWallet: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getBountiesBySupplierQuery = async (supplierId: string) => {
  return await prisma.bounty.findMany({
    where: { product: { supplierId } },
    include: {
      product: { select: { title: true } },
      issuer: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getBountyByIdQuery = async (id: string) => {
  return await prisma.bounty.findUnique({
    where: { id },
    include: {
      product: { include: { supplier: true } },
      issuer: true,
    },
  });
};

export const getAllBountiesQuery = async () => {
  return await prisma.bounty.findMany({
    where: { status: 'ACTIVE' },
    include: {
      product: { select: { title: true, category: true } },
      issuer: { select: { email: true, stellarWallet: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const submitBountyProofQuery = async (id: string, solverId: string, proofCid: string) => {
  return await prisma.bounty.update({
    where: { id },
    data: {
      solverId,
      proofCid,
      proofUploadedAt: new Date(),
      status: 'COMPLETED' // For now, we auto-complete on proof submission for simplicity in dev
    },
  });
};
