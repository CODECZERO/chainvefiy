import { Request, Response } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { ApiError } from '../util/apiError.util.js';
import { prisma } from '../lib/prisma.js';

// Recruitment → Verifier enrollment
const joinDivision = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) throw new ApiError(400, 'userId required');

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: 'VERIFIER' },
  });

  res.json(new ApiResponse(200, { userId: user.id, role: user.role }, 'Enrolled as verifier'));
});

const getMembers = AsyncHandler(async (req: Request, res: Response) => {
  const verifiers = await prisma.user.findMany({
    where: { role: 'VERIFIER' },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(new ApiResponse(200, verifiers, 'Verifiers fetched'));
});

export { joinDivision, getMembers };
