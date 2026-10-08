import { Router } from 'express';
import { asyncHandler } from '../middlewares/errors.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', asyncHandler(ctrl.login));
router.get('/me', authenticate, asyncHandler(ctrl.me));
router.get('/users', authenticate, authorize('admin'), asyncHandler(ctrl.listUsers));
router.post('/users', authenticate, authorize('admin'), asyncHandler(ctrl.createUser));

export default router;
