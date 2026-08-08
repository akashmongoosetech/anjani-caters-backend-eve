import { Router } from 'express';
import { handleChatQuery, getChatLogs } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

// Public: the site chatbot widget submits queries without auth.
router.post('/query', handleChatQuery);

// Admin-only: chat logs contain customer conversation PII.
router.get('/logs', protect, authorize('super_admin', 'admin', 'manager'), getChatLogs);

export default router;
