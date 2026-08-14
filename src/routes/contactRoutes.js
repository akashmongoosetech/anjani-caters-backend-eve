import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContact, getAllContacts, getContactById, updateContactStatus, deleteContact, deleteContactsBulk, deleteAllContacts } from '../controllers/contactController.js';
import { contactValidation } from '../validators/contactValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

const contactSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many contact submissions, please try again later.' }
});

router.post('/', contactSubmitLimiter, contactValidation, validateRequest, submitContact);
router.get('/', protect, authorize('super_admin', 'admin', 'manager', 'staff'), getAllContacts);
router.get('/:id', protect, authorize('super_admin', 'admin', 'manager', 'staff'), getContactById);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager', 'staff'), updateContactStatus);
router.delete('/bulk-delete', protect, authorize('super_admin', 'admin', 'manager', 'staff'), deleteContactsBulk);
router.delete('/delete-all', protect, authorize('super_admin', 'admin', 'manager', 'staff'), deleteAllContacts);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager', 'staff'), deleteContact);

export default router;
