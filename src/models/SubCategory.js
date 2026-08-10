import mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

subCategorySchema.index({ categoryId: 1, slug: 1 });
subCategorySchema.index({ categoryId: 1, status: 1, displayOrder: 1 });

export const SubCategory = mongoose.models.SubCategory || mongoose.model('SubCategory', subCategorySchema);
