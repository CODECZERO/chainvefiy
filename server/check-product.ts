
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProduct() {
  const id = '0f0c1ffe-8c0d-41b9-ab08-8e92545d5be9';
  const product = await prisma.product.findUnique({
    where: { id },
    include: { supplier: true }
  });
  console.log(JSON.stringify(product, null, 2));
  process.exit(0);
}

checkProduct();
