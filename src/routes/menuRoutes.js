import { Router } from 'express';
import { 
  getMenuItems, 
  getMenuItemById, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem 
} from '../controllers/menuController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createMenuItem);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateMenuItem);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteMenuItem);

export default router;
