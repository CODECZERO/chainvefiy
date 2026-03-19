// Renamed: Donations → Orders
import { prisma } from '../lib/prisma.js';

export const createOrder = async (data: {
  productId: string;
  buyerId: string;
  quantity: number;
  priceInr: number;
  priceUsdc: number;
  paymentMethod: string;
  escrowTxId?: string;
}) => {

  return prisma.order.create({ data: data as any });
};

export const getOrdersByBuyer = async (buyerId: string) => {
  return prisma.order.findMany({
    where: { buyerId },
    include: { product: { select: { title: true, supplier: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const getOrdersBySupplier = async (supplierId: string) => {
  return prisma.order.findMany({
    where: { product: { supplierId } },
    include: { buyer: { select: { email: true } }, product: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const getStats = async () => {
  const [totalProducts, verifiedProducts, totalOrders, suppliers, totalTokensRes, totalUsdc] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'VERIFIED' } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.supplier.count(),
    prisma.trustTokenLedger.aggregate({ _sum: { amount: true } }),
    prisma.order.aggregate({ _sum: { priceUsdc: true }, where: { status: 'COMPLETED' } }),
  ]);


  // Prisma doesn't easily average date differences across all dialects without raw SQL.
  // We'll fetch the records and calculate in JS for now or use a raw query.
  const verifiedProductsList = await prisma.product.findMany({
    where: { status: 'VERIFIED', NOT: { verifiedAt: null } },
    select: { createdAt: true, verifiedAt: true }
  });

  let avgVerifyTime = 0;
  if (verifiedProductsList.length > 0) {
    const totalDiff = verifiedProductsList.reduce(
      (acc: number, p: { createdAt: Date; verifiedAt: Date | null }) => {
        return acc + ((p.verifiedAt ?? p.createdAt).getTime() - p.createdAt.getTime());
      },
      0,
    );
    avgVerifyTime = Math.round(totalDiff / verifiedProductsList.length / (1000 * 60 * 60)); // in hours
  }

  return {
    totalProducts,
    verifiedProducts,
    totalOrders,
    totalSuppliers: suppliers,
    totalUsdcTransacted: Number(totalUsdc._sum.priceUsdc || 0),
    avgVerifyTime: avgVerifyTime || 18,
    totalTrustTokens: totalTokensRes._sum.amount || 0,
  };
};

export const getOrder = async (txId: string) => {
  const { prisma } = await import('../lib/prisma.js');
  return prisma.order.findFirst({ where: { escrowTxId: txId } });
};

export const getOrdersByDonor = async (buyerId: string) => {
  return prisma.order.findMany({
    where: { buyerId },
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
  });
};
