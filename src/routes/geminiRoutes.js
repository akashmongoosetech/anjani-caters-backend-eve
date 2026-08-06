import { Router } from 'express';
import { postGeminiChat, postGenerateDescription, postSuggestMenu } from '../controllers/geminiController.js';

const router = Router();

router.post('/chat', postGeminiChat);
router.post('/generate-description', postGenerateDescription);
router.post('/suggest-menu', postSuggestMenu);

export default router;
