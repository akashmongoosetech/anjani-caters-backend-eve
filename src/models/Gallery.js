import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Weddings' },
  imageUrl: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  videoType: { type: String, enum: ['mp4', 'youtube', 'vimeo'], default: 'youtube' },
  thumbnail: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export const Gallery = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);
