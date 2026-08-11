import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { getTestimonials, getAllTestimonials, getTestimonialById, submitTestimonial, createTestimonial, updateTestimonial, updateTestimonialStatus, deleteTestimonial } from '../controllers/testimonialController.js';
import { testimonialSubmitValidation, testimonialStatusValidation } from '../validators/testimonialValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';

const router = Router();

const testimonialSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many testimonial submissions, please try again later.' }
});

router.get('/', getTestimonials);
router.get('/all', protect, authorize('super_admin', 'admin', 'manager'), getAllTestimonials);
router.post('/submit', testimonialSubmitLimiter, testimonialSubmitValidation, validateRequest, submitTestimonial);
router.get('/:id', protect, authorize('super_admin', 'admin', 'manager'), getTestimonialById);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager'), testimonialStatusValidation, validateRequest, updateTestimonialStatus);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createTestimonial);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateTestimonial);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteTestimonial);

export default router;
