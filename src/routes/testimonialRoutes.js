import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '../controllers/testimonialController.js';

const router = Router();

router.get('/', getTestimonials);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createTestimonial);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateTestimonial);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteTestimonial);

export default router;
