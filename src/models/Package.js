import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  minGuests: { type: Number, default: 25 },
  maxGuests: { type: Number, default: 1000 },
  includedServices: [{ type: String }],
  includedDishes: [{ type: String }],
  image: { type: String, default: '' },
  popular: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export const Package = mongoose.models.Package || mongoose.model('Package', packageSchema);
