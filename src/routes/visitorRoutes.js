import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  trackVisit, getVisits, getVisitStats, getVisitById, deleteVisit, exportVisits,
} from '../controllers/visitorController.js';
import { visitorTrackValidation } from '../validators/visitorValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { checkHoneypot } from '../middlewares/honeypotMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many tracking requests, please try again later.' }
});

// Public: records a page visit. IP is derived server-side from the trusted
// request — clients can never submit an arbitrary IP for lookup.
router.post('/track', trackLimiter, checkHoneypot, visitorTrackValidation, validateRequest, trackVisit);

// Staff: full visitor location records (all staff roles per policy).
const STAFF = ['super_admin', 'admin', 'manager', 'staff'];
router.get('/', protect, authorize(...STAFF), getVisits);
router.get('/stats', protect, authorize(...STAFF), getVisitStats);
router.get('/export', protect, authorize(...STAFF), exportVisits);
router.get('/:id', protect, authorize(...STAFF), getVisitById);

// Deletion is restricted: retention is handled by TTL; manual deletes are admin-only.
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteVisit);

export default router;
