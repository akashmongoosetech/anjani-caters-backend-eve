import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, default: 0 },
  description: { type: String, default: '' },
  cuisine: { type: String, default: 'Multi Cuisine' },
  dietary: { type: String, enum: ['Veg', 'Jain', 'Vegan', 'Non-Veg'], default: 'Veg' },
  image: { type: String, default: '' },
  popular: { type: Boolean, default: false },
  chefSpecial: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);
