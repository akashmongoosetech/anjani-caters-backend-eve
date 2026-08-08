import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/stats', protect, authorize('super_admin', 'admin', 'manager'), getDashboardStats);

export default router;
