import { Router } from 'express';
import ipfsRoutes from './ipfs.routes.js';
import paymentRoutes from './payment.routes.js';
import userRoutes from './user.routes.js';
import stellarRoutes from './stellar.routes.js';
import userManagementRoutes from './userManagement.routes.js';
import statsRoutes from './stats.routes.js';
import userProfileRoutes from './userProfile.routes.js';
import communityRoutes from './community.routes.js';
import postRoutes from './post.routes.js';

// Contract routes (kept for Stellar payment/escrow only)
import escrowRoutes from './contracts/escrow.routes.js';
import treasuryRoutes from './contracts/treasury.routes.js';

// ─── NEW Pramanik routes (PostgreSQL via Prisma) ───
import productsRoutes from './v2/products.routes.js';
import ordersRoutes from './v2/orders.routes.js';
import suppliersRoutes from './v2/suppliers.routes.js';
import whatsappRoutes from './v2/whatsapp.routes.js';
import paymentsRoutes from './v2/payments.routes.js';
import notificationsRoutes from './v2/notifications.routes.js';
import ratesRoutes from './v2/rates.routes.js';
import qrRoutes from './v2/qr.routes.js';
import deliveryRoutes from './v2/delivery.routes.js';
import bountyRoutes from './v2/bounty.routes.js';
import buyerRoutes from './v2/buyer.routes.js';
import verificationRoutes from './v2/verification.routes.js';

const router = Router();

// ─── Core utility routes (unchanged) ───
router.use('/ipfs', ipfsRoutes);
router.use('/payment', paymentRoutes);
router.use('/user', userRoutes);
router.use('/stellar', stellarRoutes);
router.use('/user-management', userManagementRoutes);
router.use('/stats', statsRoutes);
router.use('/user-profile', userProfileRoutes);
router.use('/community', communityRoutes);
router.use('/posts', postRoutes);

// ─── Stellar contract routes (payment & escrow only) ───
router.use('/contracts/escrow', escrowRoutes);
router.use('/contracts/treasury', treasuryRoutes);

// ─── Pramanik marketplace routes ───
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/rates', ratesRoutes);
router.use('/qr', qrRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/bounties', bountyRoutes);
router.use('/buyer', buyerRoutes);
router.use('/verification', verificationRoutes);


import legacyOrderRoutes from './order.routes.js';
router.use('/donations', legacyOrderRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Pramanik API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
