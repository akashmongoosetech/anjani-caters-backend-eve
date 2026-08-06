import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({ field: err.path, message: err.msg }));
    return next(new ApiError(400, 'Validation failed for request payload', extractedErrors));
  }
  next();
};
