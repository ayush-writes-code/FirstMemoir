import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { productService } from '../services/product.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export const listProductsSchema = {
  query: z.object({
    category: z.string().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().max(50).optional(),
    sort: z.enum(['price_asc', 'price_desc', 'newest']).optional()
  })
};

const priceRegex = /^\d+(\.\d{1,2})?$/;

export const createProductSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().max(1000).optional(),
    base_price: z.string().regex(priceRegex, "Must be a valid price with up to 2 decimal places").refine(val => Number(val) > 0, "Price must be greater than 0"),
    category_ids: z.array(z.string().uuid()).min(1, "At least one category is required"),
    is_active: z.boolean().optional().default(true)
  })
};

export const updateProductSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().max(1000).optional().nullable(),
    base_price: z.string().regex(priceRegex, "Must be a valid price with up to 2 decimal places").refine(val => Number(val) > 0, "Price must be greater than 0"),
    category_ids: z.array(z.string().uuid()).min(1, "At least one category is required"),
    is_active: z.boolean().optional()
  })
};

export const idParamSchema = {
  params: z.object({ id: z.string().uuid() })
};

export const productController = {
  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, page, limit, sort } = req.query as any;
      const result = await productService.getProducts({
        category_slug: category,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sort
      });
      res.json(paginatedResponse(result.products, result.total, result.page, result.limit));
    } catch (error) {
      next(error);
    }
  },

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json(successResponse(product));
    } catch (error) {
      next(error);
    }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateProduct(req.params.id as string, req.body);
      res.json(successResponse(product));
    } catch (error) {
      next(error);
    }
  },

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.deleteProduct(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
