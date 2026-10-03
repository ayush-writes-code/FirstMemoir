import { PrismaClient, Prisma } from '@prisma/client';
import { catalogue } from './catalogue/data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with canonical catalogue...');

  // 1. Ensure core categories exist
  const coreCategories = [
    { name: 'Wall Frames', slug: 'frames', description: '8x12 inch Framed Prints' },
    { name: 'Posters & Wall Art', slug: 'posters', description: 'High quality wall posters and split designs' },
    { name: 'Bookmarks', slug: 'bookmarks', description: 'Premium coated bookmarks for book lovers' },
    { name: 'Custom Photo Prints', slug: 'custom-prints', description: 'Personalized printing' },
    { name: 'All Wall Art', slug: 'wall-art', description: 'Complete collection of wall art' }
  ];

  const categories: Record<string, string> = {};
  for (const cat of coreCategories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: { name: cat.name, slug: cat.slug, description: cat.description }
    });
    categories[cat.slug] = created.id;
  }
  console.log(`✅ Upserted ${coreCategories.length} Categories`);

  // 2. Ingest all 82 products idempotently
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of catalogue) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        sku: item.sku,
        description: item.desc,
        base_price: new Prisma.Decimal(item.base_price),
        manufacturing_metadata: item.manufacturing_metadata,
        is_active: true
      },
      create: {
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        description: item.desc,
        base_price: new Prisma.Decimal(item.base_price),
        manufacturing_metadata: item.manufacturing_metadata,
        is_active: true
      }
    });

    if (product.created_at.getTime() === product.updated_at.getTime()) {
      createdCount++;
    } else {
      updatedCount++;
    }

    // Upsert categories mapping
    await prisma.productCategory.deleteMany({ where: { product_id: product.id } });
    for (const catSlug of item.cats) {
      if (categories[catSlug]) {
        await prisma.productCategory.create({
          data: { product_id: product.id, category_id: categories[catSlug] }
        });
      }
    }

    // Upsert images
    await prisma.productImage.deleteMany({ where: { product_id: product.id } });
    for (let i = 0; i < item.images.length; i++) {
      await prisma.productImage.create({
        data: {
          product_id: product.id,
          file_key: item.images[i],
          sort_order: i,
          alt_text: item.name
        }
      });
    }
  }
  console.log(`✅ Processed ${catalogue.length} Products (${createdCount} created, ${updatedCount} updated)`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
