import { Router } from 'express';
import { asyncHandler } from '../middlewares/errors.js';
import { authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/products.controller.js';

const router = Router();

router.get('/', asyncHandler(ctrl.listProducts));
router.get('/:id', asyncHandler(ctrl.getProduct));
router.post('/', authorize('admin'), asyncHandler(ctrl.createProduct));
router.patch('/:id', authorize('admin'), asyncHandler(ctrl.updateProduct));
router.delete('/:id', authorize('admin'), asyncHandler(ctrl.deleteProduct));

export default router;
