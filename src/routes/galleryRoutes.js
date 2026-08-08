import { Router } from 'express';
import { 
  getGalleryItems, 
  getGalleryItemById, 
  createGalleryItem, 
  updateGalleryItem, 
  deleteGalleryItem 
} from '../controllers/galleryController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/', getGalleryItems);
router.get('/:id', getGalleryItemById);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createGalleryItem);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateGalleryItem);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteGalleryItem);

export default router;
