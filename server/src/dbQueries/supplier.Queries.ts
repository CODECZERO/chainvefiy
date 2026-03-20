// Renamed: Supplier → Supplier
import { prisma } from '../lib/prisma.js';

export const registerSupplier = async (data: {
  userId: string;
  name: string;
  description?: string;
  location?: string;
  category?: string;
  stellarWallet?: string;
  whatsappNumber: string;
}) => {
  return prisma.supplier.create({ data });
};

export const getSupplier = async (supplierId: string) => {
  return prisma.supplier.findUnique({
    where: { id: supplierId },
    include: { products: { where: { status: 'VERIFIED' }, take: 10 }, badges: true },
  });
};

export const findSupplierByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    include: { supplierProfile: true },
  });
};

export const getAllSuppliers = async () => {
  return prisma.supplier.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { trustScore: 'desc' },
    take: 50,
  });
};
