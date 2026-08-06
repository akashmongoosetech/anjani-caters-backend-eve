import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  client: { type: String },
  date: { type: String },
  location: { type: String },
  guestCount: { type: Number },
  description: { type: String },
  image: { type: String },
  gallery: [{ type: String }],
  menuServed: [{ type: String }],
}, { timestamps: true });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
