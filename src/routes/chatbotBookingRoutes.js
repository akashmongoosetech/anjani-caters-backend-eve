import { Router } from 'express';
import { createChatbotBooking, getAllChatbotBookings, updateChatbotBookingStatus, deleteChatbotBooking, getChatSessions } from '../controllers/chatbotBookingController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

// Public: the chatbot widget submits bookings without auth.
router.post('/booking', createChatbotBooking);

// Admin-only: booking records and chat sessions contain customer PII.
router.get('/bookings', protect, authorize('super_admin', 'admin', 'manager'), getAllChatbotBookings);
router.put('/booking/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateChatbotBookingStatus);
router.delete('/booking/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteChatbotBooking);
router.get('/sessions', protect, authorize('super_admin', 'admin', 'manager'), getChatSessions);

export default router;
