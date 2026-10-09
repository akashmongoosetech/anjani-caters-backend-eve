import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

const commentSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many comment submissions, please try again later.' }
});

router.get('/', getBlogs);
router.get('/id/:id', getBlogById);
router.get('/:slug', getBlogBySlug);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createBlog);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateBlog);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteBlog);

router.get('/:blogId/comments', getBlogComments);
router.post('/:blogId/comments', commentSubmitLimiter, createComment);

export default router;
