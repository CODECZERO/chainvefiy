import { Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { RequestK } from '../../midelware/verify.midelware.js';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { ApiError } from '../../util/apiError.util.js';

/**
 * Checks the dynamic verification status of a user.
 * - Suppliers: Verified if total sales > 5.
 * - Buyers: Verified per product if they have a DELIVERED/COMPLETED order for it.
 */
export const getVerificationStatus = AsyncHandler(async (req: RequestK, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const productId = req.query.productId as string;

  // 1. Fetch User and Roles
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      supplierProfile: {
        select: {
          id: true,
          totalSales: true,
          isVerified: true
        }
      }
    }
  });

  if (!user) throw new ApiError(404, 'User not found');

  let isVerified = false;
  let reason = 'Not verified';

  // 2. Supplier Check (Global)
  if (user.role === 'SUPPLIER' && user.supplierProfile) {
    if (user.supplierProfile.totalSales > 5) {
      isVerified = true;
      reason = 'Supplier with > 5 successful sales';
    } else {
      reason = `Supplier needs ${5 - user.supplierProfile.totalSales} more sales for verification`;
    }
  } 
  // 3. Buyer Check (Per Product)
  else if (user.role === 'BUYER') {
    if (!productId) {
      isVerified = false;
      reason = 'Buyer verification is product-specific. Please provide a productId.';
    } else {
      const order = await prisma.order.findFirst({
        where: {
          buyerId: userId,
          productId: productId,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
        }
      });

      if (order) {
        isVerified = true;
        reason = 'Verified buyer for this specific product (active purchase found)';
      } else {
        isVerified = false;
        reason = 'Not verified for this product. Must purchase it first.';
      }
    }
  } 

  return res.json(new ApiResponse(200, {
    isVerified,
    reason,
    role: user.role,
    userId: user.id,
    productId: productId || null
  }, 'Verification status fetched'));
});
