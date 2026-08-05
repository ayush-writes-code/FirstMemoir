import { prisma } from '@repo/database';
import crypto from 'crypto';
import { buildCategoryTree } from '../mappers/category.mapper.js';

export interface CreateCategoryInput {
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

function generateSlugBase(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export const categoryService = {
  async getAllCategories(options?: { active?: boolean }) {
    // Admin needs to see all categories, including inactive ones
    // Storefront queries with active = true
    return prisma.category.findMany({
      where: options?.active !== undefined ? { is_active: options.active } : undefined,
      orderBy: { sort_order: 'asc' }
    });
  },

  async getCategoryTree() {
    const categories = await prisma.category.findMany({
      orderBy: { sort_order: 'asc' }
    });
    return buildCategoryTree(categories);
  },

  async getCategoryBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug }
    });
  },

  async createCategoryService(data: CreateCategoryInput) {
    // Unique name check (case-insensitive)
    const existingName = await prisma.category.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } }
    });
    
    if (existingName) {
      throw { statusCode: 400, message: 'Category name already exists' };
    }

    const baseSlug = generateSlugBase(data.name);
    let finalSlug = baseSlug;

    // Slug collision handling
    const existingSlug = await prisma.category.findUnique({ where: { slug: finalSlug } });
    if (existingSlug) {
      // Append a short identifier to guarantee uniqueness
      const shortId = crypto.randomBytes(3).toString('hex');
      finalSlug = `${baseSlug}-${shortId}`;
    }

    try {
      return await prisma.category.create({ 
        data: {
          ...data,
          slug: finalSlug
        } 
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw { statusCode: 400, message: 'Category name already exists' };
      }
      throw error;
    }
  },

  async updateCategoryService(id: string, data: UpdateCategoryInput) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw { statusCode: 404, message: 'Category not found' };
    }

    if (data.name && data.name.toLowerCase() !== category.name.toLowerCase()) {
      const existingName = await prisma.category.findFirst({
        where: { name: { equals: data.name, mode: 'insensitive' } }
      });
      if (existingName) {
        throw { statusCode: 400, message: 'Category name already exists' };
      }
    }

    // Do NOT regenerate slug. 
    return prisma.category.update({
      where: { id },
      data
    });
  },

  async deleteCategoryService(id: string) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ 
        where: { id },
        include: {
          _count: {
            select: { products: true }
          }
        }
      });

      if (!category) {
        throw { statusCode: 404, message: 'Category not found' };
      }

      if (category._count.products > 0) {
        throw { statusCode: 400, message: 'Cannot delete category because it contains products' };
      }

      // Secure deletion
      await tx.category.delete({
        where: { id }
      });
    });
  }
};
