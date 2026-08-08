import { Router } from 'express';
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

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, resetPassword);
router.put('/change-password', protect, changePasswordValidation, validateRequest, changePassword);

export default router;
