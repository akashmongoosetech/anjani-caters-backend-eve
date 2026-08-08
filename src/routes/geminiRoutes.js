import { Router } from 'express';
import { postGeminiChat, postGenerateDescription, postSuggestMenu } from '../controllers/geminiController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

// Public: the site chatbot widget uses /chat without auth.
router.post('/chat', postGeminiChat);

// Admin-only: AI-assisted content tools used inside the admin panel.
router.post('/generate-description', protect, authorize('super_admin', 'admin', 'manager'), postGenerateDescription);
router.post('/suggest-menu', protect, authorize('super_admin', 'admin', 'manager'), postSuggestMenu);

export default router;
