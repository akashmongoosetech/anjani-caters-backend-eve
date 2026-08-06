import { Router } from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  resetUserPassword, 
  toggleUserStatus 
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/', protect, authorize('super_admin', 'admin'), getUsers);
router.get('/:id', protect, authorize('super_admin', 'admin'), getUserById);
router.post('/', protect, authorize('super_admin', 'admin'), createUser);
router.put('/:id', protect, authorize('super_admin', 'admin'), updateUser);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteUser);
router.post('/:id/reset-password', protect, authorize('super_admin', 'admin'), resetUserPassword);
router.patch('/:id/status', protect, authorize('super_admin', 'admin'), toggleUserStatus);

export default router;
