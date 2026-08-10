import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { getSubCategoriesByCategory } from '../controllers/subCategoryController.js';

const router = Router();

router.get('/', getCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:categoryId/subcategories', getSubCategoriesByCategory);
router.get('/:id', getCategoryById);
router.post('/', protect, authorize('super_admin', 'admin'), createCategory);
router.put('/:id', protect, authorize('super_admin', 'admin'), updateCategory);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteCategory);

export default router;
