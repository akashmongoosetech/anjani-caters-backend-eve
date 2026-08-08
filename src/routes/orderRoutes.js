import { Router } from 'express';
import { createOrder, getAllOrders, getOrderById, updateOrderStatus, deleteOrder } from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

// Public: order requests are submitted via the public catering form.
router.post('/', createOrder);

// Admin-only: order records expose customer details (IDOR fix).
router.get('/', protect, authorize('super_admin', 'admin', 'manager'), getAllOrders);
router.get('/:id', protect, authorize('super_admin', 'admin', 'manager'), getOrderById);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateOrderStatus);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteOrder);

export default router;
