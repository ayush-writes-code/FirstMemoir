import { prisma } from '@repo/database';

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export const categoryService = {
  async getAllCategories() {
    return prisma.category.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      include: {
        parent: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { children: true }
        }
      }
    });
  },

  async getCategoryBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug, is_active: true },
      include: {
        children: {
          where: { is_active: true }
        }
      }
    });

    if (!category) return null;
    return category;
  },

  async createCategoryService(data: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw { statusCode: 400, message: 'Category slug already exists' };
    }

    return prisma.category.create({ data });
  },

  async updateCategoryService(id: string, data: UpdateCategoryInput) {
    if (data.slug) {
      const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== id) {
        throw { statusCode: 400, message: 'Category slug already exists' };
      }
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw { statusCode: 404, message: 'Category not found' };
    }

    return prisma.category.update({
      where: { id },
      data
    });
  },

  async deleteCategoryService(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw { statusCode: 404, message: 'Category not found' };
    }

    await prisma.category.update({
      where: { id },
      data: { is_active: false }
    });
  }
};
