import mongoose from 'mongoose';

const chatInquirySchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userName: { type: String, default: 'Guest User' },
  userEmail: { type: String, default: '' },
  messages: [{
    sender: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, default: 'Active' }
}, { timestamps: true });

export const ChatInquiry = mongoose.models.ChatInquiry || mongoose.model('ChatInquiry', chatInquirySchema);
