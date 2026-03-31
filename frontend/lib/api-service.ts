// Pramanik API service — all calls go to Express backend via Prisma/PostgreSQL
// Zero blockchain reads — Stellar is only used for payments

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  return res.json();
}

// ─── Products (Marketplace) ───
export const getProducts = (params?: Record<string, string>) => {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`/products${q}`);
};

export const getProduct = (id: string) => apiFetch(`/products/${id}`);

export const createProduct = (data: any) =>
  apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });

export const addStageUpdate = (productId: string, data: any) =>
  apiFetch(`/products/${productId}/stage`, { method: 'POST', body: JSON.stringify(data) });

export const voteProduct = (productId: string, data: any) =>
  apiFetch(`/products/${productId}/vote`, { method: 'POST', body: JSON.stringify(data) });

// ─── Orders ───
export const createOrder = (data: any) =>
  apiFetch('/orders', { method: 'POST', body: JSON.stringify(data) });

export const getOrder = (id: string) => apiFetch(`/orders/${id}`);

export const confirmDelivery = (orderId: string, data: any) =>
  apiFetch(`/orders/${orderId}/confirm-delivery`, { method: 'POST', body: JSON.stringify(data) });

export const disputeOrder = (orderId: string, data: any) =>
  apiFetch(`/orders/${orderId}/dispute`, { method: 'POST', body: JSON.stringify(data) });

// ─── Suppliers ───
export const getSupplier = (id: string) => apiFetch(`/suppliers/${id}`);

export const getSupplierProducts = (id: string) => apiFetch(`/suppliers/${id}/products`);

// ─── Community ───
export const getVerifyQueue = () => apiFetch('/community/queue');

export const castVote = (data: any) =>
  apiFetch('/community/vote', { method: 'POST', body: JSON.stringify(data) });

export const getLeaderboard = () => apiFetch('/community/leaderboard');

// ─── Stats ───
export const getStats = () => apiFetch('/stats');

// ─── Auth ───
export const signup = (data: any) =>
  apiFetch('/user/signup', { method: 'POST', body: JSON.stringify(data) });

export const login = (data: any) =>
  apiFetch('/user/login', { method: 'POST', body: JSON.stringify(data) });

export const logout = () => apiFetch('/user/logout', { method: 'POST' });

export const getMe = () => apiFetch('/user/me');

// ─── Legacy aliases (keep for any remaining component refs) ───
export const getPosts = () => getProducts({ status: 'VERIFIED' });
export const verifyProof = (id: string) => getProduct(id);

export type Post = {
  id: string;
  _id: string;
  title: string;
  Title: string;
  description?: string;
  Description?: string;
  category: string;
  Type?: string;
  priceInr: number;
  NeedAmount?: number;
  status: string;
  supplier: { name: string; location: string };
  supplierId?: string;
  voteReal: number;
  voteFake: number;
  proofMediaUrls: string[];
  ImgCid?: string;
  WalletAddr?: string;
  Location?: string;
};

// Additional aliases for backward compat
export const getUserProfile = (id: string) => apiFetch(`/user-profile/${id}`);
export const getWalletProfile = (walletAddr: string) => apiFetch(`/user-profile/wallet/${walletAddr}`);
export const getOrders = () => apiFetch('/donations');
export const getNotifications = () => apiFetch('/notifications');
export const markNotificationsRead = () => apiFetch('/notifications/read-all', { method: 'PATCH' });
export const getPaymentQuote = (sourceCurrency: string, targetUsdcAmount: string) =>
  apiFetch('/payments/quote', { method: 'POST', body: JSON.stringify({ sourceCurrency, targetUsdcAmount }) });
export const initiateUPI = (data: any) => apiFetch('/payments/upi/initiate', { method: 'POST', body: JSON.stringify(data) });

// ─── Stellar / Wallet helpers (used by stellar-utils.ts) ───
export const getWalletBalance = (publicKey: string) => apiFetch(`/wallet/balance/${publicKey}`);

// Bounties
export const createBounty = (data: { productId: string; issuerId: string; amount: number; description: string }) =>
  apiFetch('/bounties', { method: 'POST', body: JSON.stringify(data) });

export const verifyBountyPayment = (data: { bountyId: string; transactionHash: string; paymentMethod?: string }) =>
  apiFetch('/bounties/verify', { method: 'POST', body: JSON.stringify(data) });

export const submitBountyProof = (data: { bountyId: string; solverId: string; proofCid: string }) =>
  apiFetch('/bounties/submit-proof', { method: 'POST', body: JSON.stringify(data) });

export const getBountiesByProduct = (productId: string) =>
  apiFetch(`/bounties/product/${productId}`);

export const getSupplierBounties = (supplierId: string) =>
  apiFetch(`/bounties/supplier/${supplierId}`);

export const getAllBounties = () => apiFetch('/bounties');

export const createStellarAccount = () => apiFetch('/wallet/create', { method: 'POST' });
export const walletPay = (data: any) =>
  apiFetch('/payment/wallet-pay', { method: 'POST', body: JSON.stringify(data) });
export const sendPayment = (data: any) =>
  apiFetch('/payment/send', { method: 'POST', body: JSON.stringify(data) });
export const getEscrowXdr = (data: { sequence?: string; [key: string]: any }) =>
  apiFetch('/contracts/escrow/create-escrow/xdr', { method: 'POST', body: JSON.stringify(data) });
export const getVoteXdr = (data: { sequence?: string; [key: string]: any }) =>
  apiFetch('/contracts/escrow/vote/xdr', { method: 'POST', body: JSON.stringify(data) });
export const getSubmitProofXdr = (data: { sequence?: string; [key: string]: any }) =>
  apiFetch('/contracts/escrow/submit-proof/xdr', { method: 'POST', body: JSON.stringify(data) });
export const submitEscrowTx = (data: { signedXdr: string }) =>
  apiFetch('/contracts/escrow/submit', { method: 'POST', body: JSON.stringify(data) });

export const getSupplierOrders = () => apiFetch('/user/supplier/orders');

export const getVerificationStatus = (productId?: string) => {
  const q = productId ? `?productId=${productId}` : '';
  return apiFetch(`/verification/status${q}`);
};

