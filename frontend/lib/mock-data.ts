export const mockProducts = [
  {
    id: 1,
    title: "Organic Turmeric 500g",
    supplier: "Ravi Farms",
    description: "Pure organic turmeric from Kerala farms. No chemicals, no additives.",
    longDescription:
      "This premium organic turmeric is sourced directly from third-generation farming families in Wayanad, Kerala. Sun-dried and hand-ground using traditional stone mills to preserve the curcumin content.",
    priceInr: 450,
    priceUsdc: 5.29,
    image: "/organic-turmeric.jpg",
    category: "Food & Spices",
    location: "Kerala, India",
    voteReal: 47,
    voteFake: 2,
    proofs: [
      { id: 1, stageName: "Harvest", txHash: "0x1234...", verified: true },
      { id: 2, stageName: "Processing", txHash: "0x5678...", verified: true },
    ],
  },
  {
    id: 2,
    title: "Handloom Cotton Saree",
    supplier: "Weavers Collective",
    description: "Traditional handloom cotton saree from Pochampally weavers",
    longDescription:
      "Authentic Pochampally Ikat saree handwoven by master artisans. Each saree takes 7-10 days to complete using natural dyes.",
    priceInr: 3500,
    priceUsdc: 41.18,
    image: "/handloom-saree.jpg",
    category: "Textiles",
    location: "Telangana, India",
    voteReal: 38,
    voteFake: 1,
    proofs: [
      { id: 1, stageName: "Weaving", txHash: "0x9abc...", verified: true },
    ],
  },
  {
    id: 3,
    title: "Cold-Pressed Coconut Oil 1L",
    supplier: "Nature's Best",
    description: "Pure cold-pressed virgin coconut oil from Kerala",
    longDescription:
      "Traditional wood-pressed extraction method preserves all nutrients. No heat processing, no chemicals. Sourced from organic coconut farms.",
    priceInr: 650,
    priceUsdc: 7.65,
    image: "/coconut-oil.jpg",
    category: "Health & Wellness",
    location: "Kerala, India",
    voteReal: 52,
    voteFake: 3,
    proofs: [],
  },
  {
    id: 4,
    title: "Darjeeling First Flush Tea 250g",
    supplier: "Mountain Tea Estate",
    description: "Premium first flush Darjeeling tea from certified estate",
    longDescription:
      "Hand-picked first flush leaves from high-altitude gardens in Darjeeling. Certified organic with full traceability from garden to cup.",
    priceInr: 1200,
    priceUsdc: 14.12,
    image: "/darjeeling-tea.jpg",
    category: "Food & Spices",
    location: "West Bengal, India",
    voteReal: 61,
    voteFake: 0,
    proofs: [
      { id: 1, stageName: "Harvest", txHash: "0xdef0...", verified: true },
    ],
  },
  {
    id: 5,
    title: "Brass Diya Set (4 pcs)",
    supplier: "Moradabad Artisans",
    description: "Hand-crafted traditional brass diyas from Moradabad",
    longDescription:
      "Exquisite brass diyas made by skilled artisans using traditional casting techniques passed down for generations. Each piece is unique.",
    priceInr: 890,
    priceUsdc: 10.47,
    image: "/brass-diya.jpg",
    category: "Handicrafts",
    location: "Uttar Pradesh, India",
    voteReal: 29,
    voteFake: 4,
    proofs: [],
  },
  {
    id: 6,
    title: "Organic Honey 500g",
    supplier: "Forest Bee Keepers",
    description: "Raw unprocessed forest honey from Sundarbans",
    longDescription:
      "Wild honey harvested by traditional bee keepers from the Sundarbans mangrove forests. No processing, no added sugar. Rich in enzymes and minerals.",
    priceInr: 550,
    priceUsdc: 6.47,
    image: "/organic-honey.jpg",
    category: "Food & Spices",
    location: "West Bengal, India",
    voteReal: 44,
    voteFake: 2,
    proofs: [
      { id: 1, stageName: "Harvest", txHash: "0x1234...", verified: true },
      { id: 2, stageName: "Packaging", txHash: "0x5678...", verified: true },
    ],
  },
]

/** @deprecated Use mockProducts instead */
export const mockTasks = mockProducts

export const mockSuppliers = [
  {
    id: 1,
    name: "Ravi Farms",
    email: "ravi@ravifarms.in",
    totalSales: 125000,
    productsSold: 280,
    trustScore: 92,
    productCount: 3,
  },
  {
    id: 2,
    name: "Weavers Collective",
    email: "info@weaverscollective.in",
    totalSales: 95000,
    productsSold: 45,
    trustScore: 88,
    productCount: 2,
  },
  {
    id: 3,
    name: "Nature's Best",
    email: "hello@naturesbest.in",
    totalSales: 85000,
    productsSold: 310,
    trustScore: 85,
    productCount: 1,
  },
]

/** @deprecated Use mockSuppliers instead */
export const mockNGOs = mockSuppliers

export const mockBuyers = [
  { id: 1, address: "GABCD...1234", totalSpent: 15000, orderCount: 8 },
  { id: 2, address: "GEFGH...5678", totalSpent: 12500, orderCount: 6 },
  { id: 3, address: "GIJKL...9012", totalSpent: 8750, orderCount: 5 },
  { id: 4, address: "GMNOP...3456", totalSpent: 6200, orderCount: 3 },
  { id: 5, address: "GQRST...7890", totalSpent: 5000, orderCount: 2 },
]

/** @deprecated Use mockBuyers instead */
export const mockDonors = mockBuyers

import { PRODUCT_CATEGORIES } from "./constants";

export const categories = ["All", ...PRODUCT_CATEGORIES];
