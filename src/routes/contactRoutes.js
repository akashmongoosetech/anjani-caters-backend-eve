import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContact, getAllContacts, getContactById, updateContactStatus, deleteContact } from '../controllers/contactController.js';
import { contactValidation } from '../validators/contactValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

const contactSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many contact submissions, please try again later.' }
});

router.post('/', contactSubmitLimiter, contactValidation, validateRequest, submitContact);
router.get('/', protect, getAllContacts);
router.get('/:id', protect, getContactById);
router.patch('/:id/status', protect, updateContactStatus);
router.delete('/:id', protect, deleteContact);

export default router;
