import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';
import { normalizeRole } from '../utils/roleNormalizer.js';

const userSchema = new mongoose.Schema({
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, default: '' },
  username: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.ADMIN },
  profilePicture: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
  permissions: { type: [String], default: ['all'] },
  verified: { type: Boolean, default: true },
  lastLogin: { type: Date },
  otpReset: {
    codeHash: { type: String, default: '' },
    expiresAt: { type: Date, default: null }
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// Self-heal legacy role values (e.g. 'Admin') into schema-valid enum values
// before validation runs, so any .save() path is safe regardless of stored data.
userSchema.pre('validate', function (next) {
  if (this.role !== undefined) {
    this.role = normalizeRole(this.role);
  }
  next();
});

userSchema.index({ isDeleted: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
