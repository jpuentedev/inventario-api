import { Router } from 'express';
import { asyncHandler } from '../middlewares/errors.js';
import * as ctrl from '../controllers/products.controller.js';

const router = Router();

router.get('/', asyncHandler(ctrl.listProducts));
router.get('/:id', asyncHandler(ctrl.getProduct));
router.post('/', asyncHandler(ctrl.createProduct));
router.patch('/:id', asyncHandler(ctrl.updateProduct));
router.delete('/:id', asyncHandler(ctrl.deleteProduct));

export default router;
