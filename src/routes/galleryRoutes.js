import { Router } from 'express';
import { 
  getGalleryItems, 
  getGalleryItemById, 
  createGalleryItem, 
  updateGalleryItem, 
  deleteGalleryItem 
} from '../controllers/galleryController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', getGalleryItems);
router.get('/:id', getGalleryItemById);
router.post('/', protect, createGalleryItem);
router.put('/:id', protect, updateGalleryItem);
router.delete('/:id', protect, deleteGalleryItem);

export default router;
