import { body } from 'express-validator';

export const newsletterValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
];
