import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting First Memoir.in Development Seed...');

  // 1. Seed Admin User
  await prisma.user.upsert({
    where: { phone_number: '9999999999' },
    update: { role: 'ADMIN', first_name: 'Super', last_name: 'Admin' },
    create: { phone_number: '9999999999', role: 'ADMIN', first_name: 'Super', last_name: 'Admin' }
  });
  console.log('✅ Upserted Admin user (9999999999)');

  // 2. Seed Categories
  const categoryData = [
    { name: 'Wall Art', slug: 'wall-art', sort_order: 1 },
    { name: 'Photo Frames', slug: 'photo-frames', sort_order: 2 },
    { name: 'Canvas Prints', slug: 'canvas-prints', sort_order: 3 },
    { name: 'Acrylic Prints', slug: 'acrylic-prints', sort_order: 4 },
    { name: 'Fine Art Prints', slug: 'fine-art-prints', sort_order: 5 },
    { name: 'Metal Prints', slug: 'metal-prints', sort_order: 6 }
  ];

  const categories: Record<string, string> = {};

  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sort_order: cat.sort_order },
      create: cat,
    });
    categories[cat.slug] = created.id;
  }
  console.log(`✅ Upserted ${categoryData.length} Categories`);

  // 3. Seed Frame Materials (Legacy mapping fallback if needed)
  const frameMaterialsData = [
    { name: 'Natural Oak Frame', type: 'FRAME', price_modifier: 499 },
    { name: 'Matte Black Frame', type: 'FRAME', price_modifier: 449 },
    { name: 'Rustic Walnut Frame', type: 'FRAME', price_modifier: 599 },
    { name: 'White Frame', type: 'FRAME', price_modifier: 349 },
    { name: 'Standard Glass', type: 'GLASS', price_modifier: 199 },
    { name: 'Anti-Glare Glass', type: 'GLASS', price_modifier: 349 }
  ];

  for (const fm of frameMaterialsData) {
    const existing = await prisma.frameMaterial.findFirst({
      where: { name: fm.name, type: fm.type as any }
    });

    if (existing) {
      await prisma.frameMaterial.update({
        where: { id: existing.id },
        data: { price_modifier: new Prisma.Decimal(fm.price_modifier) }
      });
    } else {
      await prisma.frameMaterial.create({
        data: {
          name: fm.name,
          type: fm.type as any,
          price_modifier: new Prisma.Decimal(fm.price_modifier)
        }
      });
    }
  }
  console.log(`✅ Upserted ${frameMaterialsData.length} Frame Materials`);

  // 4. Seed Products
  const photos = [
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1080&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1080&q=80',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1080&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=80',
    'https://images.unsplash.com/photo-1549887534-1541e9326642?w=1080&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1080&q=80',
    'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1080&q=80',
    'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=1080&q=80'
  ];

  const productsData = [
    { name: 'Family Portrait Frame', slug: 'family-portrait-frame', desc: 'Preserve your cherished family moments.', base_price: 1499, cats: ['photo-frames', 'wall-art'], imgIdx: 0 },
    { name: 'Wedding Memory Frame', slug: 'wedding-memory-frame', desc: 'Elegant archival framing for your most special day.', base_price: 1899, cats: ['photo-frames'], imgIdx: 1 },
    { name: 'Baby Milestone Print', slug: 'baby-milestone-print', desc: 'Beautiful fine art prints to celebrate every milestone.', base_price: 899, cats: ['fine-art-prints'], imgIdx: 2 },
    { name: 'Graduation Memory Frame', slug: 'graduation-memory-frame', desc: 'A classic frame with matting to honor your achievements.', base_price: 1299, cats: ['photo-frames'], imgIdx: 3 },
    { name: 'Travel Poster', slug: 'travel-poster', desc: 'Vibrant colors and premium paper for your favorite travel memories.', base_price: 799, cats: ['wall-art'], imgIdx: 4 },
    { name: 'Anniversary Canvas', slug: 'anniversary-canvas', desc: 'Gallery-wrapped premium canvas prints for timeless display.', base_price: 2499, cats: ['canvas-prints', 'wall-art'], imgIdx: 5 },
    { name: 'Couple Acrylic Print', slug: 'couple-acrylic-print', desc: 'Modern, high-gloss acrylic prints that make colors pop.', base_price: 2999, cats: ['acrylic-prints'], imgIdx: 6 },
    { name: 'Pet Portrait Frame', slug: 'pet-portrait-frame', desc: 'Celebrate your furry friends with our standard gallery frames.', base_price: 1199, cats: ['photo-frames'], imgIdx: 7 },
    { name: 'Industrial Metal Print', slug: 'industrial-metal-print', desc: 'Sleek metal prints for an industrial aesthetic.', base_price: 2199, cats: ['metal-prints', 'wall-art'], imgIdx: 0 }
  ];

  for (const prod of productsData) {
    const product = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        name: prod.name,
        description: prod.desc,
        base_price: new Prisma.Decimal(prod.base_price)
      },
      create: {
        name: prod.name,
        slug: prod.slug,
        description: prod.desc,
        base_price: new Prisma.Decimal(prod.base_price)
      }
    });

    await prisma.productCategory.deleteMany({ where: { product_id: product.id } });
    for (const catSlug of prod.cats) {
      if (categories[catSlug]) {
        await prisma.productCategory.create({
          data: { product_id: product.id, category_id: categories[catSlug] }
        });
      }
    }

    await prisma.productImage.deleteMany({ where: { product_id: product.id } });
    const mainImg = photos[prod.imgIdx];
    const secondImg = photos[(prod.imgIdx + 1) % photos.length];
    
    await prisma.productImage.createMany({
      data: [
        { product_id: product.id, file_key: mainImg, sort_order: 0 },
        { product_id: product.id, file_key: secondImg, sort_order: 1 }
      ]
    });

    await prisma.productOption.deleteMany({ where: { product_id: product.id } });

    const sizeOption = await prisma.productOption.create({
      data: {
        product_id: product.id,
        name: 'Size',
        input_type: 'RADIO',
        is_required: true,
        sort_order: 0,
        values: {
          create: [
            { value: '8x10', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(0), sort_order: 0 },
            { value: '12x18', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(400), sort_order: 1 },
            { value: '16x20', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(800), sort_order: 2 }
          ]
        }
      },
      include: { values: true }
    });

    const frameOption = await prisma.productOption.create({
      data: {
        product_id: product.id,
        name: 'Frame',
        input_type: 'SWATCH',
        is_required: true,
        sort_order: 1,
        values: {
          create: [
            { value: 'None', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(0), sort_order: 0 },
            { value: 'Matte Black', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(449), sort_order: 1 },
            { value: 'Natural Oak', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(499), sort_order: 2 },
            { value: 'Walnut', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(599), sort_order: 3 }
          ]
        }
      },
      include: { values: true }
    });

    const glassOption = await prisma.productOption.create({
      data: {
        product_id: product.id,
        name: 'Glass',
        input_type: 'RADIO',
        is_required: true,
        sort_order: 2,
        values: {
          create: [
            { value: 'Standard', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(199), sort_order: 0 },
            { value: 'Anti-Glare', modifier_type: 'FLAT', price_modifier: new Prisma.Decimal(349), sort_order: 1 }
          ]
        }
      },
      include: { values: true }
    });

    const paperOption = await prisma.productOption.create({
      data: {
        product_id: product.id,
        name: 'Paper',
        input_type: 'RADIO',
        is_required: true,
        sort_order: 3,
        values: {
          create: [
            { value: 'Matte', modifier_type: 'PERCENTAGE', price_modifier: new Prisma.Decimal(0), sort_order: 0 },
            { value: 'Lustre', modifier_type: 'PERCENTAGE', price_modifier: new Prisma.Decimal(10), sort_order: 1 }
          ]
        }
      },
      include: { values: true }
    });

    if (prod.cats.includes('canvas-prints')) {
      const standardGlass = glassOption.values.find(v => v.value === 'Standard');
      
      if (standardGlass) {
        await prisma.optionExclusion.create({
          data: {
            product_id: product.id,
            option_value_1_id: sizeOption.values[0].id,
            option_value_2_id: standardGlass.id
          }
        });
      }
    }

    if (prod.cats.includes('acrylic-prints')) {
      const mattePaper = paperOption.values.find(v => v.value === 'Matte');
      const noneFrame = frameOption.values.find(v => v.value === 'None');
      
      if (mattePaper && noneFrame) {
        await prisma.optionExclusion.create({
          data: {
            product_id: product.id,
            option_value_1_id: mattePaper.id,
            option_value_2_id: noneFrame.id
          }
        });
      }
    }

    if (prod.cats.includes('metal-prints')) {
      const oakFrame = frameOption.values.find(v => v.value === 'Natural Oak');
      const size8x10 = sizeOption.values.find(v => v.value === '8x10');
      
      if (oakFrame && size8x10) {
        await prisma.optionExclusion.create({
          data: {
            product_id: product.id,
            option_value_1_id: oakFrame.id,
            option_value_2_id: size8x10.id
          }
        });
      }
    }
  }
  console.log(`✅ Upserted ${productsData.length} Premium Products with Realistic Options & Exclusions`);

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
