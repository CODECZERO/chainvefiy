export interface Product {
    _id: string;
    Title: string;
    Type: string;
    Description: string;
    Location: string;
    ImgCid: string;
    NeedAmount: string;
    WalletAddr: string;
    supplierId: string;
    CollectedAmount?: number;
    Status?: "Active" | "Completed" | "Failed";
    DangerLevel?: "Low" | "Medium" | "High" | "Extreme";
    // Backward compatibility
    id?: string;
    title?: string;
    category?: string;
    goal?: number;
    raised?: number;
    image?: string;
    supplier?: string;
    createdAt?: string;
    updatedAt?: string;
}

/** @deprecated Use Product instead */
export type Post = Product;

export interface Supplier {
    _id: string;
    Email: string;
    supplierName: string;
    RegNumber: string;
    Description: string;
    PublicKey?: string;
    PrivateKey?: string;
    PhoneNo: string;
    createdAt?: string;
    updatedAt?: string;
}

/** @deprecated Use Supplier instead */
export type Supplier = Supplier;

export interface Order {
    _id: string;
    currentTxn: string;
    postIDs: string;
    Amount: number;
    Donor?: string;
    createdAt?: string;
    updatedAt?: string;
}

/** @deprecated Use Order instead */
export type Donation = Order;

export interface Expense {
    _id: string;
    currentTxn: any;
    postIDs: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface SignupData {
    supplierName: string;
    regNumber: string;
    description: string;
    email: string;
    phoneNo: string;
    password: string;
    publicKey?: string;
    privateKey?: string;
}

export interface OrderData {
    transactionId: string;
    donorId: string;
    postId: string;
    amount: number;
    escrowId?: string;
}

/** @deprecated Use OrderData instead */
export type DonationData = OrderData;

export interface PayWallet {
    PublicKey: string;
    PostId: string;
    Amount: number;
    Cid: string;
}

// Legacy type aliases (kept for backward compatibility)
export type Mission = Product;
export type DivisionCaptain = Supplier;
export type TrustInfusion = Order;
