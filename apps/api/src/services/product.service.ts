import { prisma } from '@repo/database';
import { Prisma } from '@repo/database';

export interface CreateProductInput {
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  category_ids?: string[];
  images?: { url: string; alt_text?: string; sort_order?: number }[];
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  base_price?: number;
  category_ids?: string[];
}

export const productService = {
  async getProducts(params: { category_slug?: string; page?: number; limit?: number; sort?: 'price_asc' | 'price_desc' | 'newest' }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };

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
          categories: { include: { category: true } },
          images: {
            orderBy: { sort_order: 'asc' },
            take: 1
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug, is_active: true },
      include: {
        images: { orderBy: { sort_order: 'asc' } },
        categories: { include: { category: true } }
      }
    });

    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    const frameMaterials = await prisma.frameMaterial.findMany({
      where: { is_active: true }
    });

    return { product, frameMaterials };
  },

  async createProduct(data: CreateProductInput) {
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw { statusCode: 400, message: 'Product slug already exists' };
    }

    const { category_ids, images, base_price, ...rest } = data;

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...rest,
          base_price: new Prisma.Decimal(base_price),
        }
      });

      if (category_ids && category_ids.length > 0) {
        await tx.productCategory.createMany({
          data: category_ids.map(category_id => ({
            product_id: product.id,
            category_id
          }))
        });
      }

      if (images && images.length > 0) {
        await tx.productImage.createMany({
          data: images.map(img => ({
            product_id: product.id,
            url: img.url,
            alt_text: img.alt_text,
            sort_order: img.sort_order || 0
          }))
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { categories: true, images: true }
      });
    });
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    if (data.slug) {
      const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== id) {
        throw { statusCode: 400, message: 'Product slug already exists' };
      }
    }

    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    const { category_ids, base_price, ...rest } = data;

    if (category_ids) {
      return prisma.$transaction(async (tx) => {
        // Update product
        const updateData: any = { ...rest };
        if (base_price !== undefined) {
          updateData.base_price = new Prisma.Decimal(base_price);
        }

        await tx.product.update({
          where: { id },
          data: updateData
        });

        // Delete existing category connections
        await tx.productCategory.deleteMany({ where: { product_id: id } });

        // Add new category connections
        if (category_ids.length > 0) {
          await tx.productCategory.createMany({
            data: category_ids.map(category_id => ({
              product_id: id,
              category_id
            }))
          });
        }

        return tx.product.findUnique({
          where: { id },
          include: { categories: true }
        });
      });
    } else {
      const updateData: any = { ...rest };
      if (base_price !== undefined) {
        updateData.base_price = new Prisma.Decimal(base_price);
      }
      return prisma.product.update({
        where: { id },
        data: updateData
      });
    }
  },

  async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    await prisma.product.update({
      where: { id },
      data: { is_active: false }
    });
  },

  async addProductImage(product_id: string, data: { url: string; alt_text?: string; sort_order?: number }) {
    const product = await prisma.product.findUnique({ where: { id: product_id } });
    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    return prisma.productImage.create({
      data: {
        product_id,
        url: data.url,
        alt_text: data.alt_text,
        sort_order: data.sort_order || 0
      }
    });
  },

  async deleteProductImage(image_id: string) {
    const image = await prisma.productImage.findUnique({ where: { id: image_id } });
    if (!image) {
      throw { statusCode: 404, message: 'Image not found' };
    }

    await prisma.productImage.delete({ where: { id: image_id } });
  }
};
