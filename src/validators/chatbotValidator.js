import { body } from 'express-validator';

export const chatbotBookingValidation = [
  body('name').trim().escape().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('mobile').trim().escape().notEmpty().withMessage('Mobile number is required'),
];
