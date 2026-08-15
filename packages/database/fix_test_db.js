import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shiprocket_order_id"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shiprocket_shipment_id"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "products" DROP COLUMN IF EXISTS "sku"`);
  await prisma.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE migration_name = '20260814000000_phase_6e_schema_sync'`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
