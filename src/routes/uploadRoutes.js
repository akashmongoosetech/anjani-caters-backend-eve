import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { upload, uploadPublic } from '../middlewares/uploadMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadMedia, uploadPublicMedia } from '../controllers/uploadController.js';

const router = Router();

// Public uploads are a common abuse target: tight rate limit.
const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many public uploads, please try again later.' }
});

router.post('/', protect, upload.single('file'), uploadMedia);
router.post('/public', publicUploadLimiter, uploadPublic.single('file'), uploadPublicMedia);

export default router;
