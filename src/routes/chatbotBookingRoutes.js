import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createChatbotBooking, getAllChatbotBookings, updateChatbotBookingStatus, deleteChatbotBooking, getChatSessions } from '../controllers/chatbotBookingController.js';
import { chatbotBookingValidation } from '../validators/chatbotValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { checkHoneypot } from '../middlewares/honeypotMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

const chatbotSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chatbot submissions, please try again later.' }
});

// Public: the chatbot widget submits bookings without auth.
router.post('/booking', chatbotSubmitLimiter, checkHoneypot, chatbotBookingValidation, validateRequest, createChatbotBooking);

// Admin-only: booking records and chat sessions contain customer PII.
router.get('/bookings', protect, authorize('super_admin', 'admin', 'manager'), getAllChatbotBookings);
router.put('/booking/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateChatbotBookingStatus);
router.delete('/booking/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteChatbotBooking);
router.get('/sessions', protect, authorize('super_admin', 'admin', 'manager'), getChatSessions);

export default router;
