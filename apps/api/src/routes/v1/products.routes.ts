import { Router } from 'express';
import { 
  productController, 
  listProductsSchema, 
  createProductSchema, 
  updateProductSchema, 
  idParamSchema,
  confirmProductImageSchema,
  imageIdParamSchema,
  reorderProductImagesSchema,
  createOptionSchema,
  createOptionValueSchema,
  updateOptionValueSchema,
  deleteOptionSchema,
  deleteOptionValueSchema,
  addExclusionSchema,
  deleteExclusionSchema,
  calculatePriceSchema
} from '../../controllers/product.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', validate(listProductsSchema), productController.listProducts);

router.post('/', authenticate, requireAdmin, validate(createProductSchema), productController.createProduct);

router.put('/:id', authenticate, requireAdmin, validate(idParamSchema), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, validate(idParamSchema), productController.deleteProduct);

router.get('/:id', validate(idParamSchema), productController.getProduct);
router.post('/:id/price', validate(calculatePriceSchema), productController.calculatePrice);

// Product Options
router.post('/:id/options', authenticate, requireAdmin, validate(createOptionSchema), productController.createOption);
router.post('/:id/options/:optionId/values', authenticate, requireAdmin, validate(createOptionValueSchema), productController.createOptionValue);
router.put('/:id/options/:optionId/values/:valueId', authenticate, requireAdmin, validate(updateOptionValueSchema), productController.updateOptionValue);
router.delete('/:id/options/:optionId', authenticate, requireAdmin, validate(deleteOptionSchema), productController.deleteOption);
router.delete('/:id/options/:optionId/values/:valueId', authenticate, requireAdmin, validate(deleteOptionValueSchema), productController.deleteOptionValue);

// Exclusions
router.post('/:id/exclusions', authenticate, requireAdmin, validate(addExclusionSchema), productController.addExclusion);
router.delete('/:id/exclusions/:exclusionId', authenticate, requireAdmin, validate(deleteExclusionSchema), productController.removeExclusion);

// Image endpoints
router.post('/:id/images/confirm', authenticate, requireAdmin, validate(confirmProductImageSchema), productController.confirmProductImage);
router.put('/:id/images/reorder', authenticate, requireAdmin, validate(reorderProductImagesSchema), productController.reorderProductImages);
router.delete('/:id/images/:imageId', authenticate, requireAdmin, validate(imageIdParamSchema), productController.deleteProductImage);

export default router;

