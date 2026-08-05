import { PrismaClient } from './packages/database/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  const imageCount = await prisma.productImage.count();
  const activeProducts = await prisma.product.count({ where: { is_active: true } });
  const inactiveProducts = await prisma.product.count({ where: { is_active: false } });

  console.log({
    productCount,
    categoryCount,
    imageCount,
    activeProducts,
    inactiveProducts
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
