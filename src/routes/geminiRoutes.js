import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { postGeminiChat, postGenerateDescription, postSuggestMenu, getGeminiStatus } from '../controllers/geminiController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

// Cost/abuse protection: each chat turn is a paid Gemini call.
const geminiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI chat requests, please try again later.' }
});

// Public: the site chatbot widget uses /chat without auth.
router.post('/chat', geminiChatLimiter, postGeminiChat);

// Reachability check: key presence + model (no secret, no paid call).
router.get('/status', getGeminiStatus);

// Admin-only: AI-assisted content tools used inside the admin panel.
router.post('/generate-description', protect, authorize('super_admin', 'admin', 'manager'), postGenerateDescription);
router.post('/suggest-menu', protect, authorize('super_admin', 'admin', 'manager'), postSuggestMenu);

export default router;
