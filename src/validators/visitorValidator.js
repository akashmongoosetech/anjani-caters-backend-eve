import { body } from 'express-validator';

export const visitorTrackValidation = [
  body('pagePath')
    .trim()
    .notEmpty()
    .withMessage('Page path is required')
    .isLength({ max: 500 })
    .withMessage('Page path must be at most 500 characters')
    .matches(/^\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/)
    .withMessage('Page path must be a valid site path'),
  body('referrer')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Referrer must be at most 500 characters'),
  body('sessionId')
    .optional({ values: 'falsy' })
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Session id must be at most 100 characters'),
  body('eventId')
    .optional({ values: 'falsy' })
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Event id must be at most 100 characters'),
];
