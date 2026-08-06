import { Router } from 'express';
import { upload, uploadPublic } from '../middlewares/uploadMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadMedia, uploadPublicMedia } from '../controllers/uploadController.js';

const router = Router();

router.post('/', protect, upload.single('file'), uploadMedia);
router.post('/public', uploadPublic.single('file'), uploadPublicMedia);

export default router;
