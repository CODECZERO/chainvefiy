import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { analyzeProductForFraud } from '../../services/nvidia/nim.service.js';
import { notifySupplier } from '../../services/whatsapp/whatsapp.service.js';
import { cacheGet, cacheSet, cacheInvalidate, cacheDel, buildCacheKey } from '../../lib/redis.js';
import { getUSDCtoINRRate } from '../../util/exchangeRate.util.js';
import { ImgFormater } from '../../util/ipfs.uitl.js';

export const getProducts = async (req: Request, res: Response) => {
  const { category, status, minPrice, maxPrice, search, page = '1', limit = '20' } = req.query;

  const cacheKey = buildCacheKey('products', { category, status, minPrice, maxPrice, search, page, limit });
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(new ApiResponse(200, cached, 'Products fetched (cached)'));
  }

  const where: any = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (search) where.title = { contains: search as string, mode: 'insensitive' };
  if (minPrice || maxPrice) {
    where.priceInr = {};
    if (minPrice) where.priceInr.gte = parseFloat(minPrice as string);
    if (maxPrice) where.priceInr.lte = parseFloat(maxPrice as string);
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  let products: any[] = [];
  let total = 0;
  try {
    const result = (await Promise.race([
      Promise.all([
        prisma.product.findMany({
          where,
          include: { supplier: { select: { name: true, location: true, trustScore: true, isVerified: true, stellarWallet: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.product.count({ where }),
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 5000)),
    ])) as [any[], number];
    products = result[0] as any[];
    total = result[1] as number;
  } catch {
    products = [];
    total = 0;
  }

  const formattedProducts = await Promise.all(products.map(async (p: any) => ({
    ...p,
    proofMediaUrls: await Promise.all((p.proofMediaUrls || []).map((cid: string) => ImgFormater(cid)))
  })));

  const data = { products: formattedProducts, total, page: parseInt(page as string) };
  await cacheSet(cacheKey, data, 60);

  return res.json(new ApiResponse(200, data, products.length ? 'Products fetched' : 'Products fetched (fallback)'));
};

export const getProduct = async (req: Request, res: Response) => {
  const id = String((req as any).params?.id ?? req.params.id);
  const productCacheKey = `product:${id}`;
  const cached = await cacheGet(productCacheKey);
  if (cached) {
    return res.json(new ApiResponse(200, cached, 'Product fetched (cached)'));
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true, location: true, trustScore: true, isVerified: true, whatsappNumber: true, stellarWallet: true } },
      stageUpdates: { orderBy: { stageNumber: 'asc' } },
      votes: { select: { voteType: true, createdAt: true }, take: 10, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!product) return res.status(404).json(new ApiResponse(404, null, 'Product not found'));

  const formattedProduct = {
    ...product,
    proofMediaUrls: await Promise.all((product.proofMediaUrls || []).map((cid: string) => ImgFormater(cid)))
  };

  await cacheSet(productCacheKey, formattedProduct, 120);
  return res.json(new ApiResponse(200, formattedProduct, 'Product fetched'));
};

export const createProduct = async (req: any, res: Response) => {
  const { supplierId, title, description, category, priceInr, quantity, proofMediaUrls } = req.body;

  const fraud = await analyzeProductForFraud({ title, description, priceInr: parseFloat(priceInr), category });
  if (fraud.recommendation === 'reject') {
    return res.status(400).json(new ApiResponse(400, fraud, 'Product rejected by automated review'));
  }

  const usdcInr = await getUSDCtoINRRate();
  const priceUsdc = Number(priceInr) ? Number(priceInr) / usdcInr : 0;

  const product = await prisma.product.create({
    data: {
      supplierId,
      title,
      description,
      category,
      priceInr,
      priceUsdc,
      quantity,
      proofMediaUrls: proofMediaUrls || [],
      status: fraud.recommendation === 'review' ? 'PENDING_VERIFICATION' : 'PENDING_VERIFICATION',
    },
  });

  await cacheInvalidate('products:*');
  return res.status(201).json(new ApiResponse(201, product, 'Product created'));
};


export const addStageUpdate = async (req: any, res: Response) => {
  const { stageName, note, photoUrl, videoUrl, gpsLat, gpsLng, gpsAddress } = req.body;
  const id = String((req as any).params?.id ?? req.params.id);

  const count = await prisma.stageUpdate.count({ where: { productId: id } });

  const stage = await prisma.stageUpdate.create({
    data: {
      productId: id,
      stageName: stageName || `Stage ${count + 1}`,
      stageNumber: count + 1,
      note,
      photoUrl,
      videoUrl,
      gpsLat: gpsLat ? parseFloat(gpsLat) : null,
      gpsLng: gpsLng ? parseFloat(gpsLng) : null,
      gpsAddress,
    },
  });

  await cacheDel(`product:${id}`);

  return res.status(201).json(new ApiResponse(201, stage, 'Stage update added'));
};

export const voteOnProduct = async (req: any, res: Response) => {
  const { userId, voteType, reason, stellarWallet } = req.body;
  const id = String((req as any).params?.id ?? req.params.id);

  const productCheck = await prisma.product.findUnique({ where: { id } });
  if (!productCheck) return res.status(404).json(new ApiResponse(404, null, 'Product not found'));

  // ─── Verification Guard ───
  let isVerifiedBuyer = false;
  const voter = userId 
    ? await prisma.user.findUnique({ where: { id: userId }, include: { supplierProfile: true } })
    : stellarWallet
      ? await prisma.user.findFirst({ where: { stellarWallet }, include: { supplierProfile: true } })
      : null;

  if (voter) {
    if (voter.role === 'SUPPLIER') {
      // Suppliers can always vote
    } else {
      const buyerOrder = await prisma.order.findFirst({
        where: {
          productId: id,
          buyerId: voter.id,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
        }
      });
      if (!buyerOrder) {
        return res.status(403).json(new ApiResponse(403, null, 'You must have purchased this product to vote.'));
      }
      isVerifiedBuyer = true;
    }
  } else {
    // If no user found, but wallet provided, check for active orders associated with this wallet address
    if (stellarWallet) {
        const anonymousOrder = await prisma.order.findFirst({
            where: {
                productId: id,
                status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
                buyer: {
                    stellarWallet: stellarWallet
                }
            }
        });
        if (!anonymousOrder) {
            return res.status(403).json(new ApiResponse(403, null, 'No matching purchase found for this wallet.'));
        }
        isVerifiedBuyer = true;
    } else {
        return res.status(401).json(new ApiResponse(401, null, 'User identification (User ID or Wallet) required to vote.'));
    }
  }

  // Determine effective user
  const effectiveUserId = voter?.id || (stellarWallet ? (await prisma.user.findFirst({ where: { stellarWallet } }))?.id : null);
  if (!effectiveUserId) return res.status(401).json(new ApiResponse(401, null, 'User account not found for this identifier.'));

  const existing = await prisma.vote.findUnique({
    where: { productId_userId: { productId: id, userId: effectiveUserId } },
  });
  if (existing) return res.status(409).json(new ApiResponse(409, null, 'Already voted'));

  let requiredStake = 0;
  // Waive stake for verified buyers of this specific product
  if (!isVerifiedBuyer) {
    const priceInr = Number(productCheck.priceInr);
    if (priceInr >= 20000) requiredStake = 50;
    else if (priceInr >= 5000) requiredStake = 10;
  }

  if (requiredStake > 0) {
    const userLedger = await prisma.trustTokenLedger.aggregate({
      where: { userId: effectiveUserId },
      _sum: { amount: true }
    });
    const balance = userLedger._sum.amount || 0;
    if (balance < requiredStake) {
      return res.status(400).json(new ApiResponse(400, null, `Insufficient trust tokens to vote. Requires ${requiredStake} tokens staked.`));
    }

    // Deduct stake virtually (On-chain sync would happen concurrently via frontend XDR signing)
    await prisma.trustTokenLedger.create({
      data: { userId: effectiveUserId, amount: -requiredStake, reason: 'vote_stake', referenceId: id }
    });
  }

  const vote = await prisma.vote.create({
    data: { productId: id, userId: effectiveUserId, voteType, reason, stakedAmount: requiredStake },
  });

  const updateData: any = {};
  if (voteType === 'REAL') updateData.voteReal = { increment: 1 };
  if (voteType === 'FAKE') updateData.voteFake = { increment: 1 };
  if (voteType === 'NEEDS_MORE_PROOF') updateData.voteNeedsProof = { increment: 1 };

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  const total = product.voteReal + product.voteFake + product.voteNeedsProof;
  if (total >= 10 && product.voteReal / total >= 0.6 && product.status === 'PENDING_VERIFICATION') {
    await prisma.product.update({
      where: { id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });
    
    // Release stake + bonus for REAL voters
    const realVotes = await prisma.vote.findMany({ where: { productId: id, voteType: 'REAL', stakeReleased: false } });
    for (const rv of realVotes) {
      if (rv.stakedAmount > 0) {
        await prisma.trustTokenLedger.create({ data: { userId: rv.userId, amount: rv.stakedAmount + 5, reason: 'vote_stake_released_bonus', referenceId: id }});
        await prisma.vote.update({ where: { id: rv.id }, data: { stakeReleased: true } });
      }
    }

    const url = `${process.env.APP_URL}/product/${id}`;
    await notifySupplier(product.supplierId, 'PRODUCT_VERIFIED', {
      title: product.title,
      voteReal: product.voteReal,
      url,
      productId: product.id,
    });
  }

  if (total >= 10 && product.voteFake / total >= 0.6 && product.status === 'PENDING_VERIFICATION') {
    await prisma.product.update({ where: { id }, data: { status: 'FLAGGED' } });
    
    // Slash REAL voters, reward FAKE voters
    const allVotes = await prisma.vote.findMany({ where: { productId: id, stakeReleased: false, stakeSlashed: false }});
    for (const v of allVotes) {
       if (v.voteType === 'REAL' && v.stakedAmount > 0) {
         await prisma.vote.update({ where: { id: v.id }, data: { stakeSlashed: true }});
       } else if (v.voteType === 'FAKE' && v.stakedAmount > 0) {
         await prisma.trustTokenLedger.create({ data: { userId: v.userId, amount: v.stakedAmount + 5, reason: 'vote_stake_released_bonus', referenceId: id }});
         await prisma.vote.update({ where: { id: v.id }, data: { stakeReleased: true }});
       }
    }

    await notifySupplier(product.supplierId, 'PRODUCT_FLAGGED', {
      title: product.title,
      reason: 'High number of fake votes',
      productId: product.id,
    });
  }

  await prisma.trustTokenLedger.create({
    data: { userId: effectiveUserId, amount: 1, reason: 'vote_cast', referenceId: vote.id },
  });

  await cacheDel(`product:${id}`);
  await cacheInvalidate('products:*');

  return res.status(201).json(new ApiResponse(201, vote, 'Vote recorded'));
};

export const slashEscrowVotes = async (req: Request, res: Response) => {
  const productId = String((req as any).params?.productId ?? req.params.productId);
  const realVotes = await prisma.vote.findMany({ 
    where: { productId, voteType: 'REAL', stakeReleased: false, stakeSlashed: false } 
  });
  
  let slashedCount = 0;
  if (!realVotes || realVotes.length === 0) {
     return res.json(new ApiResponse(200, { slashedCount }, 'No votes to slash.'));
  }
  for (const v of realVotes) {
    if (v.stakedAmount > 0) {
      await prisma.vote.update({ where: { id: v.id }, data: { stakeSlashed: true }});
      slashedCount++;
    }
  }
  return res.json(new ApiResponse(200, { slashedCount }, 'Votes slashed successfully.'));
};

export const getUserTrustTokens = async (req: Request, res: Response) => {
  const userId = String((req as any).params?.userId ?? req.params.userId);
  const userLedger = await prisma.trustTokenLedger.aggregate({
    where: { userId },
    _sum: { amount: true }
  });
  return res.json(new ApiResponse(200, { balance: userLedger._sum.amount || 0 }, 'Balance fetched.'));
};
