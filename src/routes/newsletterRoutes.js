import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  getSubscribers, 
  subscribeNewsletter, 
  updateSubscriberStatus, 
  deleteSubscriber, 
  bulkDeleteSubscribers, 
  exportSubscribersCSV 
} from '../controllers/newsletterController.js';
import { newsletterValidation } from '../validators/newsletterValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { checkHoneypot } from '../middlewares/honeypotMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

const newsletterSubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many subscription attempts, please try again later.' }
});

router.post('/subscribe', newsletterSubscribeLimiter, checkHoneypot, newsletterValidation, validateRequest, subscribeNewsletter);
router.get('/', protect, authorize('super_admin', 'admin', 'manager'), getSubscribers);
router.get('/export', protect, authorize('super_admin', 'admin', 'manager'), exportSubscribersCSV);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateSubscriberStatus);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteSubscriber);
router.post('/bulk-delete', protect, authorize('super_admin', 'admin', 'manager'), bulkDeleteSubscribers);

export default router;
