import { Router } from 'express';
import { handleChatQuery, getChatLogs } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/query', handleChatQuery);
router.get('/logs', protect, getChatLogs);

export default router;
