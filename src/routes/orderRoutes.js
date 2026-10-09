import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createOrder, getAllOrders, getOrderById, updateOrderStatus, deleteOrder, deleteOrdersBulk, deleteAllOrders } from '../controllers/orderController.js';
import { orderValidation } from '../validators/orderValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { checkHoneypot } from '../middlewares/honeypotMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

const orderSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many order submissions, please try again later.' }
});

// Public: order requests are submitted via the public catering form.
router.post('/', orderSubmitLimiter, checkHoneypot, orderValidation, validateRequest, createOrder);

// Admin-only: order records expose customer details (IDOR fix).
router.get('/', protect, authorize('super_admin', 'admin', 'manager'), getAllOrders);
router.get('/:id', protect, authorize('super_admin', 'admin', 'manager'), getOrderById);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateOrderStatus);
router.delete('/bulk-delete', protect, authorize('super_admin', 'admin', 'manager'), deleteOrdersBulk);
router.delete('/delete-all', protect, authorize('super_admin', 'admin', 'manager'), deleteAllOrders);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteOrder);

export default router;
