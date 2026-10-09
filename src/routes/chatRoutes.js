import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { handleChatQuery, getChatLogs } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

const chatQueryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chat requests, please try again later.' }
});

// Public: the site chatbot widget submits queries without auth.
router.post('/query', chatQueryLimiter, handleChatQuery);

// Admin-only: chat logs contain customer conversation PII.
router.get('/logs', protect, authorize('super_admin', 'admin', 'manager'), getChatLogs);

export default router;
