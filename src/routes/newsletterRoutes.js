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

const router = Router();

router.post('/subscribe', subscribeNewsletter);
router.get('/', protect, getSubscribers);
router.get('/export', protect, exportSubscribersCSV);
router.patch('/:id/status', protect, updateSubscriberStatus);
router.delete('/:id', protect, deleteSubscriber);
router.post('/bulk-delete', protect, bulkDeleteSubscribers);

export default router;
