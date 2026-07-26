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

export const createProductSchema = {
  body: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    base_price: z.coerce.number().positive(),
    category_ids: z.array(z.string().uuid()).optional(),
    images: z.array(z.object({
      url: z.string().url(),
      alt_text: z.string().optional(),
      sort_order: z.number().int().optional()
    })).optional()
  })
};

export const updateProductSchema = {
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    base_price: z.coerce.number().positive().optional(),
    category_ids: z.array(z.string().uuid()).optional()
  })
};

export const addImageSchema = {
  body: z.object({
    url: z.string().url(),
    alt_text: z.string().optional(),
    sort_order: z.number().int().optional()
  })
};

export const slugParamSchema = {
  params: z.object({ slug: z.string() })
};

export const idParamSchema = {
  params: z.object({ id: z.string().uuid() })
};

export const imageIdParamSchema = {
  params: z.object({ imageId: z.string().uuid() })
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

  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productService.getProductBySlug(req.params.slug as string);
      res.json(successResponse(data));
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
  },

  async addImage(req: Request, res: Response, next: NextFunction) {
    try {
      const image = await productService.addProductImage(req.params.id as string, req.body);
      res.status(201).json(successResponse(image));
    } catch (error) {
      next(error);
    }
  },

  async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.deleteProductImage(req.params.imageId as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
