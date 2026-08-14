import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  createBooking, getAllBookings, getBookingById, updateBooking, updateBookingStatus, deleteBooking,
  deleteBookingsBulk, deleteAllBookings,
  getBookingAvailability, getAvailableSlotsForDate
} from '../controllers/bookingController.js';
import { bookingValidation } from '../validators/bookingValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

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

// Protected routes for admin management (Super Admin, Admin, Manager only)
router.get('/', protect, authorize('super_admin', 'admin', 'manager'), getAllBookings);
router.get('/:id', protect, authorize('super_admin', 'admin', 'manager'), getBookingById);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateBooking);
router.patch('/:id/status', protect, authorize('super_admin', 'admin', 'manager'), updateBookingStatus);
router.delete('/bulk-delete', protect, authorize('super_admin', 'admin', 'manager'), deleteBookingsBulk);
router.delete('/delete-all', protect, authorize('super_admin', 'admin', 'manager'), deleteAllBookings);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteBooking);

export default router;
