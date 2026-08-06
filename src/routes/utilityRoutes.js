import { Router } from 'express';
import { submitContactInquiry, submitCalendarBooking, submitCateringOrder } from '../controllers/utilityController.js';

const router = Router();

router.post('/contact', submitContactInquiry);
router.post('/booking', submitCalendarBooking);
router.post('/order', submitCateringOrder);

export default router;
