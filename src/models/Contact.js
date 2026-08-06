import mongoose from 'mongoose';
import { CONTACT_STATUS } from '../constants/status.js';

const contactSchema = new mongoose.Schema({
  reference: { type: String, default: '' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  eventType: { type: String, default: 'General Inquiry' },
  eventDate: { type: String },
  guestCount: { type: Number },
  message: { type: String, required: true },
  status: { type: String, enum: Object.values(CONTACT_STATUS), default: CONTACT_STATUS.NEW },
  notes: { type: String, default: '' },
}, { timestamps: true });

export const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
