import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { updateServiceFAQ, deleteServiceFAQ, updateServiceFAQStatus } from '../controllers/serviceFaqController.js';

const router = Router();

router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateServiceFAQ);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateServiceFAQStatus);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteServiceFAQ);

export default router;
