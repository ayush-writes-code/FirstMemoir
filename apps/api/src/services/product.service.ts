import { prisma } from '@repo/database';
import { Prisma } from '@repo/database';
import { randomBytes } from 'crypto';

export interface CreateProductInput {
  name: string;
  description?: string;
  base_price: string;
  category_ids: string[];
  is_active?: boolean;
}

export interface UpdateProductInput {
  name: string;
  description?: string | null;
  base_price: string;
  category_ids: string[];
  is_active?: boolean;
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function serializeProduct(product: any) {
  if (!product) return product;
  return {
    ...product,
    base_price: product.base_price.toString()
  };
}

export const productService = {
  async getProducts(params: { category_slug?: string; page?: number; limit?: number; sort?: 'price_asc' | 'price_desc' | 'newest' }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.category_slug) {
      where.categories = {
        some: {
          category: { slug: params.category_slug }
        }
      };
    }

    let orderBy: any = { created_at: 'desc' };
    if (params.sort === 'price_asc') {
      orderBy = { base_price: 'asc' };
    } else if (params.sort === 'price_desc') {
      orderBy = { base_price: 'desc' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          categories: { include: { category: true } }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products: products.map(serializeProduct),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async createProduct(data: CreateProductInput) {
    let slug = generateSlug(data.name);
    
    // Slug collision handling
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      const suffix = randomBytes(3).toString('hex');
      slug = `${slug}-${suffix}`;
    }

    const { category_ids, base_price, ...rest } = data;

    // Transaction ensures both product and categories are saved together
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...rest,
          slug,
          base_price: new Prisma.Decimal(base_price),
        }
      });

      // Category assignment (if this fails, transaction rolls back)
      if (category_ids && category_ids.length > 0) {
        await tx.productCategory.createMany({
          data: category_ids.map(category_id => ({
            product_id: product.id,
            category_id
          }))
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { categories: { include: { category: true } } }
      });
    });

    return serializeProduct(result);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    const { category_ids, base_price, ...rest } = data;

    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = { ...rest };
      if (base_price !== undefined) {
        updateData.base_price = new Prisma.Decimal(base_price);
      }

      await tx.product.update({
        where: { id },
        data: updateData
      });

      if (category_ids) {
        // Complete replacement strategy for categories
        await tx.productCategory.deleteMany({ where: { product_id: id } });
        
        if (category_ids.length > 0) {
          await tx.productCategory.createMany({
            data: category_ids.map(category_id => ({
              product_id: id,
              category_id
            }))
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: { categories: { include: { category: true } } }
      });
    });

    return serializeProduct(result);
  },

  async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    // Check if product is ordered
    const orderItemCount = await prisma.orderItem.count({
      where: { product_id: id }
    });

    if (orderItemCount > 0) {
      throw { statusCode: 400, message: 'Cannot delete product that has been ordered' };
    }

    // Hard delete - productCategory rows will be cascade deleted
    await prisma.product.delete({
      where: { id }
    });
  }
};
