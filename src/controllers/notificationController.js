import { Notification } from '../models/Notification.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import {
  createNotificationHelper
} from '../utils/notificationService.js';

/**
 * Get Paginated & Filtered Notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const {
      search,
      type,
      priority,
      readStatus,
      startDate,
      endDate,
      sortBy = 'latest',
      page = 1,
      limit = 10
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { relatedRecordId: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) query.type = new RegExp(`^${type}$`, 'i');
    if (priority) query.priority = new RegExp(`^${priority}$`, 'i');
    if (readStatus !== undefined && readStatus !== '') {
      query.readStatus = String(readStatus) === 'true';
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
    if (sortBy === 'type') sortOptions = { type: 1, createdAt: -1 };

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ isDeleted: { $ne: true }, readStatus: false })
    ]);

    const response = {
      notifications: items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      unreadCount
    };

    return res.status(200).json(new ApiResponse(200, response, 'Notifications retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get Unread Count
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({ isDeleted: { $ne: true }, readStatus: false });
    return res.status(200).json(new ApiResponse(200, { unreadCount }, 'Unread count retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark Single Notification as Read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || 'Admin';

    const updated = await Notification.findByIdAndUpdate(
      id,
      {
        readStatus: true,
        $addToSet: { readBy: userRole }
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json(new ApiResponse(404, null, 'Notification not found'));
    }

    const unreadCount = await Notification.countDocuments({ isDeleted: { $ne: true }, readStatus: false });

    return res.status(200).json(new ApiResponse(200, { notification: updated, unreadCount }, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark All Notifications as Read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userRole = req.user?.role || 'Admin';

    await Notification.updateMany(
      { isDeleted: { $ne: true }, readStatus: false },
      {
        readStatus: true,
        $addToSet: { readBy: userRole }
      }
    );

    return res.status(200).json(new ApiResponse(200, { unreadCount: 0 }, 'All notifications marked as read'));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / Soft-Delete Notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Notification.findByIdAndUpdate(id, { isDeleted: true });

    const unreadCount = await Notification.countDocuments({ isDeleted: { $ne: true }, readStatus: false });

    return res.status(200).json(new ApiResponse(200, { id, unreadCount }, 'Notification deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Manually Create Notification via API
 */
export const createNotificationApi = async (req, res, next) => {
  try {
    const { title, message, type, priority, icon, recipientRoles, relatedModule, relatedRecordId, actionUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json(new ApiResponse(400, null, 'Title and message are required'));
    }

    const notification = await createNotificationHelper({
      title,
      message,
      type: type || 'System',
      priority: priority || 'Medium',
      icon: icon || 'Bell',
      recipientRoles: recipientRoles || ['Super Admin', 'Admin', 'Manager'],
      relatedModule: relatedModule || 'Other',
      relatedRecordId: relatedRecordId || '',
      actionUrl: actionUrl || '/admin/dashboard',
      createdBy: req.user?.email || 'Admin User'
    });

    return res.status(201).json(new ApiResponse(201, notification, 'Notification created successfully'));
  } catch (error) {
    next(error);
  }
};
