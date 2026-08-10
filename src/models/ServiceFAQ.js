import mongoose from 'mongoose';

const serviceFaqSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true },
  displayOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

serviceFaqSchema.index({ serviceId: 1, status: 1, displayOrder: 1 });

export const ServiceFAQ = mongoose.models.ServiceFAQ || mongoose.model('ServiceFAQ', serviceFaqSchema);
