import { Router } from 'express';
import { productController, listProductsSchema, createProductSchema, updateProductSchema, addImageSchema, slugParamSchema, idParamSchema, imageIdParamSchema } from '../../controllers/product.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', validate(listProductsSchema), productController.listProducts);
router.get('/:slug', validate(slugParamSchema), productController.getProduct);

router.post('/', authenticate, requireAdmin, validate(createProductSchema), productController.createProduct);

// Note: /images/:imageId needs to be declared before /:id otherwise /:id will capture "images" as an ID
router.delete('/images/:imageId', authenticate, requireAdmin, validate(imageIdParamSchema), productController.deleteImage);

router.put('/:id', authenticate, requireAdmin, validate(idParamSchema), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, validate(idParamSchema), productController.deleteProduct);

router.post('/:id/images', authenticate, requireAdmin, validate(idParamSchema), validate(addImageSchema), productController.addImage);

export default router;
