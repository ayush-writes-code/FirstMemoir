import { Router } from 'express';
import { 
  productController, 
  listProductsSchema, 
  createProductSchema, 
  updateProductSchema, 
  idParamSchema,
  confirmProductImageSchema,
  imageIdParamSchema,
  reorderProductImagesSchema
} from '../../controllers/product.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', validate(listProductsSchema), productController.listProducts);

router.post('/', authenticate, requireAdmin, validate(createProductSchema), productController.createProduct);

router.put('/:id', authenticate, requireAdmin, validate(idParamSchema), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, validate(idParamSchema), productController.deleteProduct);

// Image endpoints
router.post('/:id/images/confirm', authenticate, requireAdmin, validate(confirmProductImageSchema), productController.confirmProductImage);
router.put('/:id/images/reorder', authenticate, requireAdmin, validate(reorderProductImagesSchema), productController.reorderProductImages);
router.delete('/:id/images/:imageId', authenticate, requireAdmin, validate(imageIdParamSchema), productController.deleteProductImage);

export default router;

