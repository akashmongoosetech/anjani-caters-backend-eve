import mongoose from 'mongoose';
import { BOOKING_STATUS } from '../constants/status.js';

const bookingSchema = new mongoose.Schema({
  bookingReference: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  eventType: { type: String, required: true },
  eventDate: { type: Date, required: true },
  eventTime: { type: String, default: '12:00 PM' },
  guestCount: { type: Number, required: true },
  preferredCuisine: { type: String, default: 'Multi Cuisine' },
  cateringPackage: { type: String, default: 'Royal Buffet' },
  budget: { type: Number, default: 0 },
  venueAddress: { type: String, required: true },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  specialRequirements: { type: String, default: '' },
  attachment: { type: String, default: '' },
  status: { type: String, default: BOOKING_STATUS.NEW_BOOKING },
  notes: { type: String, default: '' },
  source: { type: String, default: 'website' }
}, { timestamps: true });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
