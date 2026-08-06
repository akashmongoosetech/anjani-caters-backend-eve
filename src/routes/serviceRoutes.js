import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { getServices, getServiceBySlug, createService, updateService, deleteService } from '../controllers/serviceController.js';

const router = Router();

router.get('/', getServices);
router.get('/:slug', getServiceBySlug);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createService);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateService);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteService);

export default router;
