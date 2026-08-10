import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import {
  getSubCategories,
  getSubCategoryById,
  getSubCategoryBySlug,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from '../controllers/subCategoryController.js';

const router = Router();

router.get('/', getSubCategories);
router.get('/slug/:slug', getSubCategoryBySlug);
router.get('/:id', getSubCategoryById);
router.post('/', protect, authorize('super_admin', 'admin'), createSubCategory);
router.put('/:id', protect, authorize('super_admin', 'admin'), updateSubCategory);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteSubCategory);

export default router;
