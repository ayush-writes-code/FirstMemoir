import { prisma, Prisma } from '@repo/database';
import { env } from '../config/env.js';

export interface CreateOptionInput {
  product_id: string;
  name: string;
  input_type: 'SELECT' | 'RADIO' | 'BUTTON' | 'SWATCH';
  is_required?: boolean;
}

export interface CreateOptionValueInput {
  option_id: string;
  value: string;
  metadata?: any;
  modifier_type?: 'FLAT' | 'PERCENTAGE';
  price_modifier?: number;
  global_material_id?: string | null;
  track_inventory?: boolean;
  stock_count?: number;
}

export const productOptionsService = {
  async getProductWithOptions(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: { include: { category: true } },
        images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
        options: {
          orderBy: { sort_order: 'asc' },
          include: {
            values: { orderBy: { sort_order: 'asc' } }
          }
        },
        exclusions: true
      }
    });

    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    return {
      ...product,
      base_price: product.base_price.toString(),
      images: product.images.map(img => {
        const isAbsolute = img.file_key.startsWith('http://') || img.file_key.startsWith('https://');
        return {
          ...img,
          url: isAbsolute ? img.file_key : `${env.R2_PUBLIC_URL}/${img.file_key}`
        };
      }),
      options: product.options.map(opt => ({
        ...opt,
        values: opt.values.map(v => ({
          ...v,
          price_modifier: v.price_modifier.toString()
        }))
      }))
    };
  },

  async getProductWithOptionsBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        categories: { include: { category: true } },
        images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
        options: {
          orderBy: { sort_order: 'asc' },
          include: {
            values: { orderBy: { sort_order: 'asc' } }
          }
        },
        exclusions: true
      }
    });

    if (!product) {
      throw { statusCode: 404, message: 'Product not found' };
    }

    return {
      ...product,
      base_price: product.base_price.toString(),
      images: product.images.map(img => {
        const isAbsolute = img.file_key.startsWith('http://') || img.file_key.startsWith('https://');
        return {
          ...img,
          url: isAbsolute ? img.file_key : `${env.R2_PUBLIC_URL}/${img.file_key}`
        };
      }),
      options: product.options.map(opt => ({
        ...opt,
        values: opt.values.map(v => ({
          ...v,
          price_modifier: v.price_modifier.toString()
        }))
      }))
    };
  },

  async createOption(data: CreateOptionInput) {
    const maxSort = await prisma.productOption.findFirst({
      where: { product_id: data.product_id },
      orderBy: { sort_order: 'desc' }
    });

    return prisma.productOption.create({
      data: {
        ...data,
        sort_order: maxSort ? maxSort.sort_order + 1 : 0
      }
    });
  },

  async createOptionValue(data: CreateOptionValueInput) {
    const maxSort = await prisma.productOptionValue.findFirst({
      where: { option_id: data.option_id },
      orderBy: { sort_order: 'desc' }
    });

    return prisma.productOptionValue.create({
      data: {
        ...data,
        price_modifier: new Prisma.Decimal(data.price_modifier || 0),
        sort_order: maxSort ? maxSort.sort_order + 1 : 0
      }
    });
  },

  async deleteOption(id: string) {
    await prisma.productOption.delete({ where: { id } });
  },

  async deleteOptionValue(id: string) {
    await prisma.productOptionValue.delete({ where: { id } });
  },

  async addExclusion(product_id: string, option_value_1_id: string, option_value_2_id: string) {
    // Canonical ordering
    const id1 = option_value_1_id < option_value_2_id ? option_value_1_id : option_value_2_id;
    const id2 = option_value_1_id < option_value_2_id ? option_value_2_id : option_value_1_id;

    return prisma.optionExclusion.create({
      data: {
        product_id,
        option_value_1_id: id1,
        option_value_2_id: id2
      }
    });
  },

  async removeExclusion(exclusion_id: string) {
    await prisma.optionExclusion.delete({ where: { id: exclusion_id } });
  }
};
