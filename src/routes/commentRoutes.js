import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAllComments,
  getCommentById,
  getCommentReplies,
  createReply,
  approveComment,
  rejectComment,
  deleteComment
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

router.get('/', protect, authorize('super_admin', 'admin', 'manager'), getAllComments);
router.get('/:id', protect, authorize('super_admin', 'admin', 'manager'), getCommentById);
router.get('/:commentId/replies', getCommentReplies);
router.post('/:commentId/replies', commentSubmitLimiter, createReply);
router.patch('/:id/approve', protect, authorize('super_admin', 'admin', 'manager'), approveComment);
router.patch('/:id/reject', protect, authorize('super_admin', 'admin', 'manager'), rejectComment);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteComment);

export default router;
