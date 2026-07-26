import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { categoryService } from '../services/category.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createCategorySchema = {
  body: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    parent_id: z.string().uuid().optional(),
    image_url: z.string().url().optional(),
    sort_order: z.number().int().optional()
  })
};

export const updateCategorySchema = {
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    parent_id: z.string().uuid().optional(),
    image_url: z.string().url().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional()
  })
};

export const slugParamSchema = {
  params: z.object({ slug: z.string() })
};

export const idParamSchema = {
  params: z.object({ id: z.string().uuid() })
};

export const categoryController = {
  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.getAllCategories();
      res.json(successResponse(categories));
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
      res.json(successResponse(category));
    } catch (error) {
      next(error);
    }
  },

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.createCategoryService(req.body);
      res.status(201).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  },

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.updateCategoryService(req.params.id as string, req.body);
      res.json(successResponse(category));
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
