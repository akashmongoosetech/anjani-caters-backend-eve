import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

categorySchema.index({ slug: 1 });
categorySchema.index({ status: 1, displayOrder: 1 });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
