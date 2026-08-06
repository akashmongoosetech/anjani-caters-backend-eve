import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  createBooking, getAllBookings, getBookingById, updateBooking, updateBookingStatus, deleteBooking,
  getBookingAvailability, getAvailableSlotsForDate
} from '../controllers/bookingController.js';
import { bookingValidation } from '../validators/bookingValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

const bookingSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many booking submissions, please try again later.' }
});

// Public routes for slot & availability lookup and booking submission
router.get('/availability', getBookingAvailability);
router.get('/slots', getAvailableSlotsForDate);
router.post('/', bookingSubmitLimiter, bookingValidation, validateRequest, createBooking);

// Protected routes for admin management
router.get('/', protect, getAllBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id', protect, updateBooking);
router.patch('/:id/status', protect, updateBookingStatus);
router.delete('/:id', protect, deleteBooking);

export default router;
