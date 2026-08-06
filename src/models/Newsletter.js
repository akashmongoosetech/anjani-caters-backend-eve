import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive', 'Unsubscribed'], default: 'Active' },
  source: { type: String, default: 'Website Footer' }
}, { timestamps: true });

export const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema);
