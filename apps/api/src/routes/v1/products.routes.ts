import { Router } from 'express';
import { productController, listProductsSchema, createProductSchema, updateProductSchema, idParamSchema } from '../../controllers/product.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', validate(listProductsSchema), productController.listProducts);

router.post('/', authenticate, requireAdmin, validate(createProductSchema), productController.createProduct);

router.put('/:id', authenticate, requireAdmin, validate(idParamSchema), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, validate(idParamSchema), productController.deleteProduct);

export default router;
