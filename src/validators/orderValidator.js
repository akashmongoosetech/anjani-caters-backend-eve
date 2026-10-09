import { body } from 'express-validator';

export const orderValidation = [
  body('customerName').trim().escape().notEmpty().withMessage('Customer name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').trim().escape().notEmpty().withMessage('Phone number is required'),
  body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
  body('deliveryAddress').trim().escape().notEmpty().withMessage('Delivery address is required'),
];
