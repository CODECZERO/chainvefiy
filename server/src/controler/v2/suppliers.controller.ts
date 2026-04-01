import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { ImgFormater } from '../../util/ipfs.uitl.js';

export const getSupplier = async (req: Request, res: Response) => {
  const id = String((req as any).params?.id ?? req.params.id);
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      badges: true,
      products: {
        where: { status: 'VERIFIED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!supplier) return res.status(404).json(new ApiResponse(404, null, 'Supplier not found'));
  return res.json(new ApiResponse(200, supplier, 'Supplier fetched'));
};

export const getSupplierProducts = async (req: Request, res: Response) => {
  const id = String((req as any).params?.id ?? req.params.id);
  const products = await prisma.product.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: 'desc' },
  });

  const formattedProducts = await Promise.all(products.map(async (p: any) => ({
    ...p,
    proofMediaUrls: await Promise.all((p.proofMediaUrls || []).map((cid: string) => ImgFormater(cid)))
  })));

  return res.json(new ApiResponse(200, formattedProducts, 'Products fetched'));
};

export const registerSupplier = async (req: Request, res: Response) => {
  const { userId, name, description, location, category, stellarWallet, whatsappNumber } = req.body;

  const supplier = await prisma.supplier.create({
    data: { userId, name, description, location, category, stellarWallet, whatsappNumber },
  });
  return res.status(201).json(new ApiResponse(201, supplier, 'Supplier registered'));
};

export const flagSupplier = async (req: Request, res: Response) => {
  const id = String((req as any).params?.id ?? req.params.id);
  const supplier = await prisma.supplier.update({
    where: { id },
    data: { flagCount: { increment: 1 } },
  });
  return res.json(new ApiResponse(200, supplier, 'Supplier flagged successfully'));
};

export const getSupplierAnalytics = async (req: Request, res: Response) => {
  const id = String((req as any).params?.id ?? req.params.id);

  const orders = await prisma.order.findMany({
    where: { product: { supplierId: id }, status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
    include: { product: true }
  });

  const revenueByMonth = orders.reduce((acc: Record<string, number>, order) => {
    const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + (Number(order.priceUsdc) || 0);
    return acc;
  }, {});

  const revenueSeries = Object.entries(revenueByMonth).map(([name, total]) => ({ name, uv: total, pv: total }));

  // ── Currency Distribution (New) ──
  const currencyDist = orders.reduce((acc: Record<string, number>, order) => {
    const curr = order.sourceCurrency || 'USDC';
    acc[curr] = (acc[curr] || 0) + (Number(order.priceUsdc) || 0);
    return acc;
  }, {});
  const currencySeries = Object.entries(currencyDist).map(([name, value]) => ({ name, value }));

  // ── Daily Volume - Last 14 days (New) ──
  const now = new Date();
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyVolume = last14Days.map(dateStr => {
    if (!dateStr) return { date: '', orders: 0, revenue: 0 };
    const dayOrders = orders.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === dateStr);
    return {
      date: dateStr.split('-').slice(1).join('/'),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + Number(o.priceUsdc || 0), 0)
    };
  });

  const categoryRank = "#1 in your category";

  const buyerCounts = orders.reduce((acc: Record<string, number>, order) => {
    acc[order.buyerId] = (acc[order.buyerId] || 0) + 1;
    return acc;
  }, {});
  
  const totalBuyers = Object.keys(buyerCounts).length;
  const repeatBuyers = Object.values(buyerCounts).filter(count => count > 1).length;
  const repeatBuyerRate = totalBuyers > 0 ? ((repeatBuyers / totalBuyers) * 100).toFixed(0) : "0";

  // ─── Phase 4b: QR Scan Analytics ───
  const qrCodes = await prisma.qRCode.findMany({
    where: { supplierId: id },
    select: {
      id: true,
      totalScans: true,
      browserScans: true,
      machineScans: true,
      totalAnchors: true,
      anomalyCount: true,
      productId: true,
      product: { select: { title: true } }
    }
  });

  const totalScans = qrCodes.reduce((sum, qr) => sum + qr.totalScans, 0);
  const totalAnchors = qrCodes.reduce((sum, qr) => sum + qr.totalAnchors, 0);
  const totalAnomalies = qrCodes.reduce((sum, qr) => sum + qr.anomalyCount, 0);
  const machineScans = qrCodes.reduce((sum, qr) => sum + qr.machineScans, 0);
  const browserScans = qrCodes.reduce((sum, qr) => sum + qr.browserScans, 0);

  let mostScannedProduct = { title: "None", scans: 0 };
  const productScans: Record<string, { title: string, scans: number }> = {};
  for (const qr of qrCodes) {
    if (qr.productId && qr.product) {
      if (!productScans[qr.productId]) productScans[qr.productId] = { title: qr.product.title, scans: 0 };
      productScans[qr.productId]!.scans += qr.totalScans;
      if (productScans[qr.productId]!.scans > mostScannedProduct.scans) {
        mostScannedProduct = productScans[qr.productId]!;
      }
    }
  }

  const scans = await prisma.qRScan.findMany({
    where: { qrCode: { supplierId: id }, ipCountry: { not: null } },
    select: { ipCountry: true }
  });
  
  const countryCounts = scans.reduce((acc: Record<string, number>, scan) => {
    if (scan.ipCountry) acc[scan.ipCountry] = (acc[scan.ipCountry] || 0) + 1;
    return acc;
  }, {});
  
  const topCountries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([country]) => country);

  const qrAnalytics = {
    totalScansThisMonth: totalScans,
    topScanCountries: topCountries,
    machineVsBrowserRatio: totalScans > 0 ? {
      machine: Number((machineScans / totalScans).toFixed(2)),
      browser: Number((browserScans / totalScans).toFixed(2))
    } : { machine: 0, browser: 0 },
    anomalousScanCount: totalAnomalies,
    mostScannedProduct,
    averageJourneyLength: qrCodes.length > 0 ? Number((totalScans / qrCodes.length).toFixed(1)) : 0,
    stellarAnchorsThisMonth: totalAnchors
  };

  return res.json(new ApiResponse(200, {
    revenueByMonth: revenueSeries.length > 0 ? revenueSeries : [
      { name: 'Jan', uv: 0, pv: 0 },
      { name: 'Feb', uv: 0, pv: 0 }
    ],
    currencyDistribution: currencySeries,
    dailyVolume,
    repeatBuyerRate,
    categoryRank,
    topProducts: orders.slice(0, 3).map(o => ({ title: o.product.title, quantity: o.quantity })),
    qrAnalytics
  }, 'Analytics fetched'));
};
