import { Router } from 'express';
import { 
  getSubscribers, 
  subscribeNewsletter, 
  updateSubscriberStatus, 
  deleteSubscriber, 
  bulkDeleteSubscribers, 
  exportSubscribersCSV 
} from '../controllers/newsletterController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.post('/subscribe', subscribeNewsletter);
router.get('/', protect, authorize('super_admin', 'admin', 'manager'), getSubscribers);
router.get('/export', protect, authorize('super_admin', 'admin', 'manager'), exportSubscribersCSV);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateSubscriberStatus);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteSubscriber);
router.post('/bulk-delete', protect, authorize('super_admin', 'admin', 'manager'), bulkDeleteSubscribers);

export default router;
