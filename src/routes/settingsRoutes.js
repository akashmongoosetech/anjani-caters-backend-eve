import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/', getSettings);
router.put('/', protect, authorize('super_admin', 'admin'), updateSettings);

export default router;
