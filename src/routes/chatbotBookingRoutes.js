import { Router } from 'express';
import { createChatbotBooking, getAllChatbotBookings, updateChatbotBookingStatus, deleteChatbotBooking, getChatSessions } from '../controllers/chatbotBookingController.js';

const router = Router();

router.post('/booking', createChatbotBooking);
router.get('/bookings', getAllChatbotBookings);
router.put('/booking/:id/status', updateChatbotBookingStatus);
router.delete('/booking/:id', deleteChatbotBooking);
router.get('/sessions', getChatSessions);

export default router;
