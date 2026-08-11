import { body } from 'express-validator';

export const testimonialSubmitValidation = [
  body('name').trim().escape().notEmpty().withMessage('Name is required').isLength({ max: 80 }).withMessage('Name must be at most 80 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').optional({ values: 'falsy' }),
  body('city').trim().escape().isLength({ max: 100 }).withMessage('City must be at most 100 characters').optional({ values: 'falsy' }),
  body('eventType').trim().escape().isLength({ max: 100 }).withMessage('Event type must be at most 100 characters').optional({ values: 'falsy' }),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').optional({ values: 'falsy' }),
  body('comment').trim().escape().notEmpty().withMessage('Review is required').isLength({ max: 1000 }).withMessage('Review must be at most 1000 characters'),
  body('avatar').trim().isLength({ max: 500 }).withMessage('Avatar must be at most 500 characters').optional({ values: 'falsy' })
];

export const testimonialStatusValidation = [
  body('status').trim().notEmpty().withMessage('Status is required').isIn(['Pending', 'Approved', 'Rejected']).withMessage('Status must be Pending, Approved, or Rejected')
];
