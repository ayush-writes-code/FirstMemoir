import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { categoryService } from '../services/category.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { toCategoryDto } from '../mappers/category.mapper.js';

export const listCategoriesSchema = {
  query: z.object({
    active: z.enum(['true', 'false']).transform((val) => val === 'true').optional()
  })
};

export const createCategorySchema = {
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().min(0, "Sort order must be 0 or greater").optional()
  })
};

export const updateCategorySchema = {
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters").optional(),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().min(0, "Sort order must be 0 or greater").optional()
  })
};

export const slugParamSchema = {
  params: z.object({ slug: z.string() })
};

export const idParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid category ID format") })
};

export const categoryController = {
  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { active } = req.query as any;
      const categories = await categoryService.getAllCategories({ active });
      res.json(successResponse(categories.map(toCategoryDto)));
    } catch (error) {
      next(error);
    }
  },

  async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tree = await categoryService.getCategoryTree();
      res.json(successResponse(tree));
    } catch (error) {
      next(error);
    }
  },

  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.getCategoryBySlug(req.params.slug as string);
      if (!category) {
        return res.status(404).json(errorResponse('Category not found', 404));
      }
      res.json(successResponse(toCategoryDto(category)));
    } catch (error) {
      next(error);
    }
  },

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.createCategoryService(req.body);
      res.status(201).json(successResponse(toCategoryDto(category)));
    } catch (error) {
      next(error);
    }
  },

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.updateCategoryService(req.params.id as string, req.body);
      res.json(successResponse(toCategoryDto(category)));
    } catch (error) {
      next(error);
    }
  },

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await categoryService.deleteCategoryService(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
