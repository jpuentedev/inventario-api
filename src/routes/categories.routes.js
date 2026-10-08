import { Router } from 'express';
import { asyncHandler } from '../middlewares/errors.js';
import * as ctrl from '../controllers/categories.controller.js';

const router = Router();

router.get('/', asyncHandler(ctrl.listCategories));
router.post('/', asyncHandler(ctrl.createCategory));
router.delete('/:id', asyncHandler(ctrl.deleteCategory));

export default router;
