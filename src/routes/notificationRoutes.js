import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotificationApi
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = Router();

// All notification routes require an authenticated staff/admin account.
router.use(protect, authorize('super_admin', 'admin', 'manager', 'staff'));

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/', createNotificationApi);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
