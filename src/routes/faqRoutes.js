import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../controllers/faqController.js';

const router = Router();

router.get('/', getFAQs);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createFAQ);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateFAQ);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteFAQ);

export default router;
