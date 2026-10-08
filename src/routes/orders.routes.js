import { Router } from 'express';
import { asyncHandler } from '../middlewares/errors.js';
import * as ctrl from '../controllers/orders.controller.js';

const router = Router();

router.get('/', asyncHandler(ctrl.listOrders));
router.get('/:id', asyncHandler(ctrl.getOrder));
router.post('/', asyncHandler(ctrl.createOrder));
router.post('/:id/cancel', asyncHandler(ctrl.cancelOrder));

export default router;
