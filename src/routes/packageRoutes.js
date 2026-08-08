import { Router } from 'express';
import { 
  getPackages, 
  getPackageById, 
  createPackage, 
  updatePackage, 
  deletePackage 
} from '../controllers/packageController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/', getPackages);
router.get('/:id', getPackageById);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createPackage);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updatePackage);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deletePackage);

export default router;
