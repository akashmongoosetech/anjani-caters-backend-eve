import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Client' },
  company: { type: String },
  rating: { type: Number, default: 5 },
  comment: { type: String, required: true },
  avatar: { type: String },
  eventType: { type: String }
}, { timestamps: true });

export const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);
