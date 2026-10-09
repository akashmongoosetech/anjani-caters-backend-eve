import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile
} from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation
} from '../validators/authValidator.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// Brute-force protection: login/register share a moderately strict bucket,
// OTP issuance/consume gets a tighter one to prevent email bombing + code guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password-reset attempts, please try again later.' }
});

router.post('/register', loginLimiter, registerValidation, validateRequest, register);
router.post('/login', loginLimiter, loginValidation, validateRequest, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logout', logout);
router.post('/forgot-password', otpLimiter, forgotPasswordValidation, validateRequest, forgotPassword);
router.post('/reset-password', otpLimiter, resetPasswordValidation, validateRequest, resetPassword);
router.put('/change-password', protect, changePasswordValidation, validateRequest, changePassword);

export default router;
