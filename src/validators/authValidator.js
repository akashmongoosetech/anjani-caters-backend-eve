import { body } from 'express-validator';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').notEmpty().withMessage('Mobile phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

export const loginValidation = [
  body('emailOrMobile').notEmpty().withMessage('Email or mobile number is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const forgotPasswordValidation = [
  body('emailOrMobile').notEmpty().withMessage('Email or mobile number is required')
];

export const resetPasswordValidation = [
  body('emailOrMobile').notEmpty().withMessage('Email or mobile number is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('A valid 6-digit verification code is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];
