import { Router } from 'express';
import { categoryController, createCategorySchema, updateCategorySchema, slugParamSchema, idParamSchema, listCategoriesSchema } from '../../controllers/category.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', validate(listCategoriesSchema), categoryController.listCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/:slug', validate(slugParamSchema), categoryController.getCategory);

router.post('/', authenticate, requireAdmin, validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', authenticate, requireAdmin, validate(idParamSchema), validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', authenticate, requireAdmin, validate(idParamSchema), categoryController.deleteCategory);

export default router;
