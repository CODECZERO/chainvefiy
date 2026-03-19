import { prisma } from '../lib/prisma.js';

export const submitVote = async (
  productId: string,
  userId: string,
  voteType: 'REAL' | 'FAKE' | 'NEEDS_MORE_PROOF',
  reason?: string
) => {
  const existing = await prisma.vote.findUnique({
    where: { productId_userId: { productId, userId } },
  });
  if (existing) throw new Error('Already voted on this product');

  const vote = await prisma.vote.create({
    data: { productId, userId, voteType, reason },
  });

  // Update product vote counts
  const updateData: any = {};
  if (voteType === 'REAL') updateData.voteReal = { increment: 1 };
  if (voteType === 'FAKE') updateData.voteFake = { increment: 1 };
  if (voteType === 'NEEDS_MORE_PROOF') updateData.voteNeedsProof = { increment: 1 };

  const product = await prisma.product.update({
    where: { id: productId },
    data: updateData,
  });

  // Award trust token for voting
  await prisma.trustTokenLedger.create({
    data: { userId, amount: 1, reason: 'vote_cast', referenceId: vote.id },
  });

  // Auto-verify if ≥10 votes and ≥60% real
  const total = product.voteReal + product.voteFake + product.voteNeedsProof;
  if (total >= 10 && product.status === 'PENDING_VERIFICATION') {
    if (product.voteReal / total >= 0.6) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'VERIFIED', verifiedAt: new Date() },
      });
    } else if (product.voteFake / total >= 0.6) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'FLAGGED' },
      });
    }
  }

  return { vote, product };
};

export const getVotesForProduct = async (productId: string) => {
  return prisma.vote.findMany({
    where: { productId },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const getPendingVerificationQueue = async (limit = 20) => {
  return prisma.product.findMany({
    where: { status: 'PENDING_VERIFICATION' },
    include: {
      supplier: { select: { name: true, location: true, trustScore: true } },
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
};

export const getLeaderboard = async () => {
  const leaders = await prisma.trustTokenLedger.groupBy({
    by: ['userId'],
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 20,
  });

  const userIds = leaders.map((l: { userId: string }) => l.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { 
      id: true, 
      email: true, 
      supplierProfile: { select: { name: true } },
      _count: { select: { votes: true } },
      votes: { 
        select: { isAccurate: true }, // Assuming isAccurate is a boolean determined when product verification is completed
      }
    },
  });

  return leaders.map((l: { userId: string; _sum: { amount: number | null } }) => {
    const user = users.find((u: { id: string }) => u.id === l.userId);
    const votesCount = user?._count.votes || 0;
    // Accuracy calculation (simplified: percentage of votes that are not flagged as inaccurate)
    const activeVotes = user?.votes || [];
    const accurateVotes = activeVotes.filter((v: { isAccurate: boolean | null }) => v.isAccurate !== false).length;
    const accuracy = votesCount > 0 ? Math.round((accurateVotes / votesCount) * 100) : 100;

    return {
      userId: l.userId,
      tokens: l._sum.amount || 0,
      votes: votesCount,
      accuracy: `${accuracy}%`,
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.supplierProfile?.name || user?.email?.split('@')[0] || 'Verifier',
      },
    };
  });
};
