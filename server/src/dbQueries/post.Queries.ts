import { prisma } from '../lib/prisma.js';

export const getPosts = async (filters?: {
  category?: string;
  status?: string;
  supplierId?: string;
  search?: string;
}) => {
  const where: any = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.status) where.status = filters.status;
  if (filters?.supplierId) where.supplierId = filters.supplierId;
  if (filters?.search) where.title = { contains: filters.search, mode: 'insensitive' };

  return prisma.product.findMany({
    where,
    include: {
      supplier: { select: { name: true, location: true, trustScore: true, isVerified: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

export const savePostData = async (data: {
  supplierId: string;
  title: string;
  description?: string;
  category: string;
  priceInr: number;
  quantity?: string;
  proofMediaUrls?: string[];
}) => {
  return prisma.product.create({
    data: {
      supplierId: data.supplierId,
      title: data.title,
      description: data.description,
      category: data.category,
      priceInr: data.priceInr,
      quantity: data.quantity,
      proofMediaUrls: data.proofMediaUrls || [],
      status: 'PENDING_VERIFICATION',
    },
  });
};

export const getPostById = async (id: string) => {
  return prisma.product.findUnique({
    where: { id },
    include: {
      supplier: true,
      stageUpdates: { orderBy: { stageNumber: 'asc' } },
      votes: { take: 20, orderBy: { createdAt: 'desc' } },
    },
  });
};
