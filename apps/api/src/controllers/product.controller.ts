import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { productService } from '../services/product.service.js';
import { productOptionsService } from '../services/product-options.service.js';
import { pricingService } from '../services/pricing.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { toProductDto, toProductWithOptionsDto, toProductOptionDto, toProductOptionValueDto, toOptionExclusionDto } from '../mappers/product.mapper.js';

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
  // Accepts both UUIDs and slug strings — the controller handles detection
  params: z.object({ id: z.string().min(1) })
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
      const dtos = result.products.map(toProductDto);
      res.json(paginatedResponse(dtos, result.total, result.page, result.limit));
    } catch (error) {
      next(error);
    }
  },

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json(successResponse(toProductDto(product as any)));
    } catch (error) {
      next(error);
    }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateProduct(req.params.id as string, req.body);
      res.json(successResponse(toProductDto(product as any)));
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

  async confirmProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const image = await productService.confirmProductImage(req.params.id as string, req.body);
      res.status(201).json(successResponse(image));
    } catch (error) {
      next(error);
    }
  },

  async deleteProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.deleteProductImage(req.params.id as string, req.params.imageId as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async reorderProductImages(req: Request, res: Response, next: NextFunction) {
    try {
      const images = await productService.reorderProductImages(req.params.id as string, req.body.image_ids);
      res.json(successResponse(images));
    } catch (error) {
      next(error);
    }
  },

  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      // Unified idOrSlug: detect whether param is a UUID or a slug
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const product = uuidRegex.test(id)
        ? await productOptionsService.getProductWithOptions(id)
        : await productOptionsService.getProductWithOptionsBySlug(id);
      res.json(successResponse(toProductWithOptionsDto(product as any)));
    } catch (error) {
      next(error);
    }
  },

  async createOption(req: Request, res: Response, next: NextFunction) {
    try {
      const option = await productOptionsService.createOption({
        product_id: req.params.id,
        ...req.body
      });
      res.status(201).json(successResponse(toProductOptionDto(option as any)));
    } catch (error) {
      next(error);
    }
  },

  async createOptionValue(req: Request, res: Response, next: NextFunction) {
    try {
      const value = await productOptionsService.createOptionValue({
        option_id: req.params.optionId as string,
        ...req.body
      });
      res.status(201).json(successResponse(toProductOptionValueDto(value)));
    } catch (error) {
      next(error);
    }
  },

  async deleteOption(req: Request, res: Response, next: NextFunction) {
    try {
      await productOptionsService.deleteOption(req.params.optionId as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async deleteOptionValue(req: Request, res: Response, next: NextFunction) {
    try {
      await productOptionsService.deleteOptionValue(req.params.valueId as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async addExclusion(req: Request, res: Response, next: NextFunction) {
    try {
      const exclusion = await productOptionsService.addExclusion(
        req.params.id as string,
        req.body.option_value_1_id,
        req.body.option_value_2_id
      );
      res.status(201).json(successResponse(toOptionExclusionDto(exclusion)));
    } catch (error) {
      next(error);
    }
  },

  async removeExclusion(req: Request, res: Response, next: NextFunction) {
    try {
      await productOptionsService.removeExclusion(req.params.exclusionId as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async calculatePrice(req: Request, res: Response, next: NextFunction) {
    try {
      const breakdown = await pricingService.calculatePrice(req.params.id as string, req.body.selected_option_value_ids);
      res.json(successResponse(breakdown));
    } catch (error) {
      next(error);
    }
  }
};

export const confirmProductImageSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    file_key: z.string().min(1, "File key is required"),
    alt_text: z.string().max(255).optional().nullable()
  })
};

export const imageIdParamSchema = {
  params: z.object({
    id: z.string().uuid(),
    imageId: z.string().uuid()
  })
};

export const reorderProductImagesSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    image_ids: z.array(z.string().uuid()).min(1, "image_ids array must not be empty")
  })
};

export const createOptionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1),
    input_type: z.enum(['SELECT', 'RADIO', 'BUTTON', 'SWATCH']),
    is_required: z.boolean().optional()
  })
};

export const createOptionValueSchema = {
  params: z.object({ id: z.string().uuid(), optionId: z.string().uuid() }),
  body: z.object({
    value: z.string().min(1),
    metadata: z.any().optional(),
    modifier_type: z.enum(['FLAT', 'PERCENTAGE']).optional(),
    price_modifier: z.number().optional(),
    global_material_id: z.string().uuid().nullable().optional(),
    track_inventory: z.boolean().optional(),
    stock_count: z.number().optional()
  })
};

export const deleteOptionSchema = {
  params: z.object({ id: z.string().uuid(), optionId: z.string().uuid() })
};

export const deleteOptionValueSchema = {
  params: z.object({ id: z.string().uuid(), optionId: z.string().uuid(), valueId: z.string().uuid() })
};

export const addExclusionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    option_value_1_id: z.string().uuid(),
    option_value_2_id: z.string().uuid()
  })
};

export const deleteExclusionSchema = {
  params: z.object({ id: z.string().uuid(), exclusionId: z.string().uuid() })
};

export const calculatePriceSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    selected_option_value_ids: z.array(z.string().uuid())
  })
};

