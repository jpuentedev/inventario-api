import { Router } from 'express';
import { asyncHandler } from '../middlewares/errors.js';
import { authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/categories.controller.js';

const router = Router();

router.get('/', asyncHandler(ctrl.listCategories));
router.post('/', authorize('admin'), asyncHandler(ctrl.createCategory));
router.delete('/:id', authorize('admin'), asyncHandler(ctrl.deleteCategory));

export default router;
