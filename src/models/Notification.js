import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Booking', 'Contact', 'Order', 'Chatbot', 'Newsletter', 'Payment', 'System', 'Warning', 'Success'],
    default: 'System',
    index: true
  },
  icon: {
    type: String,
    default: 'Bell'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
    index: true
  },
  recipientRoles: {
    type: [String],
    default: ['Super Admin', 'Admin', 'Manager']
  },
  relatedModule: {
    type: String,
    enum: ['Booking', 'Contact', 'Order', 'Chatbot', 'Newsletter', 'User', 'System', 'Other'],
    default: 'Other'
  },
  relatedRecordId: {
    type: String,
    default: ''
  },
  readStatus: {
    type: Boolean,
    default: false,
    index: true
  },
  readBy: {
    type: [String],
    default: []
  },
  actionUrl: {
    type: String,
    default: '/admin/dashboard'
  },
  createdBy: {
    type: String,
    default: 'System'
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
