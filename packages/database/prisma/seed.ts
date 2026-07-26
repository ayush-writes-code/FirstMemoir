import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 0. Seed Admin User
  await prisma.user.upsert({
    where: { phone_number: '9999999999' },
    update: { role: 'ADMIN', first_name: 'Super', last_name: 'Admin' },
    create: { phone_number: '9999999999', role: 'ADMIN', first_name: 'Super', last_name: 'Admin' }
  });
  console.log('Upserted Admin user (9999999999)');

  // 1. Seed Categories
  const categoryData = [
    { name: 'Framed Prints', slug: 'framed-prints', sort_order: 1 },
    { name: 'Canvas Prints', slug: 'canvas-prints', sort_order: 2 },
    { name: 'Posters', slug: 'posters', sort_order: 3 },
    { name: 'Photo Books', slug: 'photo-books', sort_order: 4 },
    { name: 'Wall Art', slug: 'wall-art', sort_order: 5 },
    { name: 'Personalised Gifts', slug: 'personalised-gifts', sort_order: 6 }
  ];

  const categories: Record<string, string> = {};

  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    categories[cat.slug] = created.id;
    console.log(`Upserted category: ${cat.name}`);
  }

  const subCategories = [
    { name: 'Black & White', slug: 'black-and-white', sort_order: 7, parent_id: categories['framed-prints'] },
    { name: 'Portrait Frames', slug: 'portrait-frames', sort_order: 8, parent_id: categories['framed-prints'] }
  ];

  for (const cat of subCategories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    categories[cat.slug] = created.id;
    console.log(`Upserted category: ${cat.name}`);
  }

  // 2. Seed Frame Materials
  const frameMaterialsData = [
    { name: 'Natural Oak Frame', type: 'FRAME', price_modifier: 499 },
    { name: 'Matte Black Frame', type: 'FRAME', price_modifier: 449 },
    { name: 'Rustic Walnut Frame', type: 'FRAME', price_modifier: 599 },
    { name: 'White Frame', type: 'FRAME', price_modifier: 349 },
    { name: 'Standard Glass', type: 'GLASS', price_modifier: 199 },
    { name: 'Anti-Glare Glass', type: 'GLASS', price_modifier: 349 }
  ];

  for (const fm of frameMaterialsData) {
    // Need a unique identifier to upsert? Frame materials don't have a slug, we can check by name & type
    const existing = await prisma.frameMaterial.findFirst({
      where: { name: fm.name, type: fm.type as any }
    });

    if (existing) {
      await prisma.frameMaterial.update({
        where: { id: existing.id },
        data: { price_modifier: new Prisma.Decimal(fm.price_modifier) }
      });
      console.log(`Updated frame material: ${fm.name}`);
    } else {
      await prisma.frameMaterial.create({
        data: {
          name: fm.name,
          type: fm.type as any,
          price_modifier: new Prisma.Decimal(fm.price_modifier)
        }
      });
      console.log(`Created frame material: ${fm.name}`);
    }
  }

  // 3. Seed Products
  const photos = [
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?w=800',
    'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800',
    'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=800'
  ];

  const productsData = [
    { name: 'Mountain Serenity Print', slug: 'mountain-serenity-print', base_price: 1299, cats: ['framed-prints', 'wall-art'], imgIdx: 0 },
    { name: 'Ocean Horizon Canvas', slug: 'ocean-horizon-canvas', base_price: 1599, cats: ['canvas-prints'], imgIdx: 1 },
    { name: 'Urban Architecture Poster', slug: 'urban-architecture-poster', base_price: 799, cats: ['posters'], imgIdx: 2 },
    { name: 'Golden Hour Portrait Frame', slug: 'golden-hour-portrait-frame', base_price: 1899, cats: ['framed-prints', 'portrait-frames'], imgIdx: 3 },
    { name: 'Forest Walk Canvas', slug: 'forest-walk-canvas', base_price: 1399, cats: ['canvas-prints', 'wall-art'], imgIdx: 4 },
    { name: 'City Lights Black & White', slug: 'city-lights-black-white', base_price: 1099, cats: ['black-and-white', 'posters'], imgIdx: 5 },
    { name: 'Coastal Sunrise Print', slug: 'coastal-sunrise-print', base_price: 1199, cats: ['framed-prints'], imgIdx: 6 },
    { name: 'Abstract Geometry Poster', slug: 'abstract-geometry-poster', base_price: 899, cats: ['posters', 'wall-art'], imgIdx: 7 }
  ];

  for (const prod of productsData) {
    const existing = await prisma.product.findUnique({
      where: { slug: prod.slug }
    });

    const mainImg = photos[prod.imgIdx];
    const secondImg = photos[(prod.imgIdx + 1) % photos.length];

    if (existing) {
      // Just update basic fields
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: prod.name,
          base_price: new Prisma.Decimal(prod.base_price)
        }
      });
      console.log(`Updated product: ${prod.name}`);
    } else {
      const product = await prisma.product.create({
        data: {
          name: prod.name,
          slug: prod.slug,
          base_price: new Prisma.Decimal(prod.base_price)
        }
      });

      // Categories
      for (const catSlug of prod.cats) {
        if (categories[catSlug]) {
          await prisma.productCategory.create({
            data: {
              product_id: product.id,
              category_id: categories[catSlug]
            }
          });
        }
      }

      // Images
      await prisma.productImage.createMany({
        data: [
          { product_id: product.id, url: mainImg, sort_order: 0 },
          { product_id: product.id, url: secondImg, sort_order: 1 }
        ]
      });

      console.log(`Created product: ${prod.name}`);
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
