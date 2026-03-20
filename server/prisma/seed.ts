import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Create 1 demo buyer
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@demo.com' },
    update: {},
    create: { email: 'buyer@demo.com', passwordHash: 'demo', role: 'BUYER' },
  })

  // Create 1 demo supplier
  const supplierUser = await prisma.user.upsert({
    where: { email: 'supplier@demo.com' },
    update: {},
    create: { email: 'supplier@demo.com', passwordHash: 'demo', role: 'SUPPLIER', whatsappNumber: '+919999999999' },
  })

  const supplier = await prisma.supplier.upsert({
    where: { whatsappNumber: '+919999999999' },
    update: {},
    create: {
      userId: supplierUser.id, name: 'Ravi Farms',
      location: 'Wayanad, Kerala', category: 'Food & Spices',
      whatsappNumber: '+919999999999', trustScore: 92, isVerified: true,
    },
  })

  // Create 3 demo products
  const products = [
    { title: 'Organic Turmeric 500g', category: 'Food & Spices', priceInr: 450, voteReal: 47, voteFake: 2, status: 'VERIFIED' as const },
    { title: 'Kerala Coconut Oil 1L', category: 'Food & Spices', priceInr: 380, voteReal: 31, voteFake: 1, status: 'VERIFIED' as const },
    { title: 'Alphonso Mangoes 1kg', category: 'Agriculture', priceInr: 650, voteReal: 12, voteFake: 0, status: 'PENDING_VERIFICATION' as const },
  ]

  for (const p of products) {
    await prisma.product.create({
      data: { supplierId: supplier.id, ...p, proofMediaUrls: [] },
    })
  }

  console.log('Seed complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
