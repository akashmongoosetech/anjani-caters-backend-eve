import { body } from 'express-validator';

export const bookingValidation = [
  body('fullName').trim().escape().notEmpty().withMessage('Full Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').trim().escape().notEmpty().matches(/^(\+91[\s-]?)?[6-9]\d{9}$/).withMessage('Valid mobile number is required'),
  body('eventType').trim().escape().notEmpty().withMessage('Event type is required'),
  body('eventDate').notEmpty().isISO8601().withMessage('Valid event date is required'),
  body('guestCount').isNumeric().withMessage('Guest count must be a positive number'),
  body('venueAddress').trim().escape().notEmpty().withMessage('Venue address is required')
];
