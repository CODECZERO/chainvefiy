import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';

const router = Router();

// GET public supplier profile
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
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
}));

// GET supplier products
router.get('/:id/products', asyncHandler(async (req: Request, res: Response) => {
  const id = String((req as any).params?.id ?? req.params.id);
  const products = await prisma.product.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(new ApiResponse(200, products, 'Products fetched'));
}));

// POST register supplier
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { userId, name, description, location, category, stellarWallet, whatsappNumber } = req.body;

  const supplier = await prisma.supplier.create({
    data: { userId, name, description, location, category, stellarWallet, whatsappNumber },
  });
  return res.status(201).json(new ApiResponse(201, supplier, 'Supplier registered'));
}));

export default router;
