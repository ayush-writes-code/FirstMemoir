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

import { env } from '../config/env.js';

function serializeProduct(product: any) {
  if (!product) return product;
  const serialized = {
    ...product,
    base_price: product.base_price.toString()
  };

  if (serialized.images) {
    serialized.images = serialized.images.map((img: any) => {
      // If file_key is already an absolute URL (e.g. Unsplash seed image), use it directly
      const isAbsolute = img.file_key.startsWith('http://') || img.file_key.startsWith('https://');
      return {
        ...img,
        url: isAbsolute ? img.file_key : `${env.R2_PUBLIC_URL}/${img.file_key}`
      };
    });
  } else {
    serialized.images = [];
  }

  return serialized;
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
          categories: { include: { category: true } },
          images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] }
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

      return product.id;
    });

    const createdProduct = await prisma.product.findUniqueOrThrow({
      where: { id: result },
      include: { categories: { include: { category: true } }, images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] } }
    });

    return serializeProduct(createdProduct);
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

      return id;
    });

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: result },
      include: { categories: { include: { category: true } }, images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] } }
    });

    return serializeProduct(updatedProduct);
  },

  async confirmProductImage(productId: string, data: { file_key: string, alt_text?: string }) {
    // 1. Verify product exists
    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    // 2. Server-side verification of R2 object
    const { storageService } = await import('./storage.service.js');
    await storageService.verifyFile(data.file_key, {
      expectedPrefix: 'products/',
      allowedMimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
      maxSizeBytes: 5 * 1024 * 1024 // 5MB limit
    });

    // 3. Persist record
    const highestSort = await prisma.productImage.findFirst({
      where: { product_id: productId },
      orderBy: { sort_order: 'desc' }
    });
    
    const newSortOrder = highestSort ? highestSort.sort_order + 1 : 0;

    const newImage = await prisma.productImage.create({
      data: {
        product_id: productId,
        file_key: data.file_key,
        alt_text: data.alt_text,
        sort_order: newSortOrder
      }
    });

    const isAbsolute = newImage.file_key.startsWith('http://') || newImage.file_key.startsWith('https://');
    return {
      ...newImage,
      url: isAbsolute ? newImage.file_key : `${env.R2_PUBLIC_URL}/${newImage.file_key}`
    };
  },

  async deleteProductImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId }
    });

    if (!image || image.product_id !== productId) {
      throw { statusCode: 404, message: 'Image not found' };
    }

    // 1. Delete database record
    await prisma.productImage.delete({ where: { id: imageId } });

    // 2. Best-effort R2 deletion
    const { storageService } = await import('./storage.service.js');
    storageService.deleteFile(image.file_key).catch(err => {
      console.error(`Failed to delete orphaned R2 object: ${image.file_key}`, err);
    });
  },

  async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] } }
    });

    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    const orderItemCount = await prisma.orderItem.count({
      where: { product_id: id }
    });

    if (orderItemCount > 0) {
      throw { statusCode: 400, message: 'Cannot delete product that has been ordered' };
    }

    const fileKeys = product.images.map(img => img.file_key);

    await prisma.product.delete({
      where: { id }
    });

    // Best-effort cascade R2 deletion
    const { storageService } = await import('./storage.service.js');
    for (const key of fileKeys) {
      storageService.deleteFile(key).catch(err => {
        console.error(`Failed to delete cascaded R2 object: ${key}`, err);
      });
    }
  },

  async reorderProductImages(productId: string, imageIds: string[]) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] } }
    });

    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    const existingImageIds = product.images.map(img => img.id);
    if (
      existingImageIds.length !== imageIds.length ||
      !imageIds.every(id => existingImageIds.includes(id))
    ) {
      throw { statusCode: 400, message: 'Invalid image_ids: must match existing product images' };
    }

    // Atomic reorder within a single transaction
    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.productImage.update({
          where: { id },
          data: { sort_order: index }
        })
      )
    );

    const updatedImages = await prisma.productImage.findMany({
      where: { product_id: productId },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
    });

    return updatedImages.map(img => {
      const isAbsolute = img.file_key.startsWith('http://') || img.file_key.startsWith('https://');
      return {
        ...img,
        url: isAbsolute ? img.file_key : `${env.R2_PUBLIC_URL}/${img.file_key}`
      };
    });
  }
};
