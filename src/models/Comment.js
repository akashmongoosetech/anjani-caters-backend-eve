import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  blogId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  mobile: { type: String, default: '', trim: true },
  profileImage: { type: String, default: '' },
  comment: { type: String, required: true, trim: true },
  isReply: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

commentSchema.index({ blogId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1, createdAt: 1 });
commentSchema.index({ status: 1, isDeleted: 1 });

export const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
