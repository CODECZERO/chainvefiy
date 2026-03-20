
// Network Configuration
export const NETWORK_LABELS = {
    TESTNET: "Stellar Testnet",
    MAINNET: "Stellar Mainnet",
    FUTURENET: "Stellar Futurenet",
};

// Product Categories
export const PRODUCT_CATEGORIES = [
    "Food & Spices",
    "Textiles",
    "Health & Wellness",
    "Handicrafts",
    "Home & Living",
    "Jewelry",
    "Art & Decor",
    "Agriculture",
];

/** @deprecated Use PRODUCT_CATEGORIES instead */
export const TASK_CATEGORIES = PRODUCT_CATEGORIES;

// API Endpoints
export const API_ROUTES = {
    PRODUCTS: "/products",
    COMMUNITY: "/community",
    ORDERS: "/orders",
    AUTH: "/supplier",
    USER: "/user",
    PAYMENTS: "/payments",
};
