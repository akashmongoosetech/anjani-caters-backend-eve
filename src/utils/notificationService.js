import { Notification } from '../models/Notification.js';

let _notifEmitter = null;

export function setNotificationEmitter(fn) {
  _notifEmitter = fn;
}

/**
 * Reusable helper to dispatch and persist a new notification across the system
 */
export async function createNotificationHelper({
  title,
  message,
  type = 'System',
  icon = 'Bell',
  priority = 'Medium',
  recipientRoles = ['Super Admin', 'Admin', 'Manager'],
  relatedModule = 'Other',
  relatedRecordId = '',
  actionUrl = '/admin/dashboard',
  createdBy = 'System'
}) {
  const now = new Date();

  const notifObj = {
    title,
    message,
    type,
    icon,
    priority,
    recipientRoles,
    relatedModule,
    relatedRecordId,
    readStatus: false,
    readBy: [],
    actionUrl,
    createdBy,
    isDeleted: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  try {
    const doc = await Notification.create(notifObj);
    notifObj._id = doc._id.toString();
  } catch (err) {
    console.error('Failed to persist notification to MongoDB:', err.message);
    return null;
  }

  // Emit real-time via Socket.IO if emitter is registered
  if (_notifEmitter) {
    _notifEmitter(notifObj);
  }

  console.log(`[Notification System] New ${type} Notification Created: "${title}"`);
  return notifObj;
}
