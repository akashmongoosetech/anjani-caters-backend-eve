import { Router } from 'express';
import { 
  getBlogs, 
  getBlogById,
  getBlogBySlug, 
  createBlog, 
  updateBlog, 
  deleteBlog 
} from '../controllers/blogController.js';
import {
  getBlogComments,
  createComment
} from '../controllers/commentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/', getBlogs);
router.get('/id/:id', getBlogById);
router.get('/:slug', getBlogBySlug);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createBlog);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateBlog);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteBlog);

router.get('/:blogId/comments', getBlogComments);
router.post('/:blogId/comments', createComment);

export default router;
