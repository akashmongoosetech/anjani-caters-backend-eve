import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactInquiry, submitCalendarBooking, submitCateringOrder } from '../controllers/utilityController.js';

const router = Router();

// Same abuse protection as the other public intake routes (bookings/contacts/testimonials).
const utilitySubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions, please try again later.' }
});

router.post('/contact', utilitySubmitLimiter, submitContactInquiry);
router.post('/booking', utilitySubmitLimiter, submitCalendarBooking);
router.post('/order', utilitySubmitLimiter, submitCateringOrder);

export default router;
