import { body } from 'express-validator';

export const contactValidation = [
  body('name').trim().escape().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').trim().escape().notEmpty().withMessage('Phone number is required'),
  body('message').trim().escape().notEmpty().withMessage('Message content is required')
];
