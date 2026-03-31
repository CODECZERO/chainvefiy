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
  let userId = req.user?.id;
  const walletFromQuery = req.query.wallet as string;

  if (!userId && !walletFromQuery) {
    throw new ApiError(401, 'Unauthorized — User ID or Wallet required');
  }

  const productId = req.query.productId as string;

  // 1. Fetch User and Roles
  const user = userId 
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: { supplierProfile: { select: { id: true, totalSales: true, isVerified: true } } }
      })
    : await prisma.user.findFirst({
        where: { stellarWallet: walletFromQuery },
        include: { supplierProfile: { select: { id: true, totalSales: true, isVerified: true } } }
      });

  if (!user) throw new ApiError(404, 'User not found');
  userId = user.id; // Correct the userId for subsequent queries if it was wallet-based

  let isVerified = false;
  let reason = 'Not verified';

  // 2. Global Supplier Check (Verified if total sales > 5)
  if (user.supplierProfile && user.supplierProfile.totalSales > 5) {
    isVerified = true;
    reason = 'Global Verified Supplier (> 5 sales)';
  } 

  // 3. Purchase Verification Check (Per Product - available for ALL roles)
  if (productId) {
    const order = await prisma.order.findFirst({
      where: {
        buyerId: userId,
        productId: productId,
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
      }
    });

    if (order) {
      isVerified = true; // Overwrites global if global was false, keeps true if global was true
      reason = order.status === 'COMPLETED' 
        ? 'Verified buyer (Contract Completed)' 
        : 'Verified buyer (Purchase in progress/delivered)';
    } else if (!isVerified) {
       reason = 'Not a verified buyer for this product. Purchase required.';
    }
  } else if (!isVerified) {
    reason = 'Verification is either Global (Suppliers) or Per-Product (Buyers). Please provide productId for purchase check.';
  }

  return res.json(new ApiResponse(200, {
    isVerified,
    reason,
    role: user.role,
    userId: user.id,
    productId: productId || null
  }, 'Verification status fetched'));
});
