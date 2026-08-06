import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  featuredImage: { type: String, default: '' },
  galleryImages: [{ type: String }],
  author: { type: String, default: 'Eveng Culinary Team' },
  authorAvatar: { type: String, default: '' },
  category: { type: String, default: 'Catering Trends' },
  tags: [{ type: String }],
  readingTime: { type: String, default: '5 min read' },
  publishDate: { type: Date, default: Date.now },
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  metaKeywords: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive', 'Draft', 'Published'], default: 'Active' }
}, { timestamps: true });

blogPostSchema.index({ tags: 1 });

export const BlogPost = mongoose.models.BlogPost || mongoose.model('BlogPost', blogPostSchema);
