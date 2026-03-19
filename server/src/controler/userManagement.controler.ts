import { Request, Response } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { prisma } from '../lib/prisma.js';

const getAllUsers = AsyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true, stellarWallet: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json(new ApiResponse(200, users, 'Users fetched'));
});

const getUserById = AsyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id as string },
    include: { supplierProfile: true },
  });
  if (!user) throw new ApiError(404, 'User not found');
  return res.json(new ApiResponse(200, user, 'User fetched'));
});

const updateUserRole = AsyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id as string },
    data: { role },
  });
  return res.json(new ApiResponse(200, user, 'Role updated'));
});

export { getAllUsers, getUserById, updateUserRole };
