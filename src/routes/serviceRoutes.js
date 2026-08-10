import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { getServices, getServiceBySlug, createService, updateService, deleteService, deleteServicesBulk, deleteAllServices } from '../controllers/serviceController.js';
import { getServiceFAQs, createServiceFAQ } from '../controllers/serviceFaqController.js';

const router = Router();

router.get('/', getServices);
router.get('/:serviceId/faqs', getServiceFAQs);
router.post('/:serviceId/faqs', protect, authorize('super_admin', 'admin', 'manager'), createServiceFAQ);
router.get('/:slug', getServiceBySlug);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createService);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateService);
router.delete('/bulk-delete', protect, authorize('super_admin', 'admin', 'manager'), deleteServicesBulk);
router.delete('/delete-all', protect, authorize('super_admin', 'admin', 'manager'), deleteAllServices);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteService);

export default router;
