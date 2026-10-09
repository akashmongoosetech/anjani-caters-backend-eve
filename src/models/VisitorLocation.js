import mongoose from 'mongoose';

// Visitor visit records. One document per tracked page view (NOT per unique
// visitor — repeated visits from the same IP/session create new records).
// Raw IPs auto-expire via TTL (90 days retention policy).
const visitorLocationSchema = new mongoose.Schema({
  ipAddress: { type: String, default: '', trim: true, maxlength: 64 },
  ipAnonymized: { type: Boolean, default: false },
  country: { type: String, default: '', trim: true, maxlength: 100 },
  countryCode: { type: String, default: '', trim: true, maxlength: 8 },
  region: { type: String, default: '', trim: true, maxlength: 100 },
  regionCode: { type: String, default: '', trim: true, maxlength: 16 },
  city: { type: String, default: '', trim: true, maxlength: 100 },
  zip: { type: String, default: '', trim: true, maxlength: 24 },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  timezone: { type: String, default: '', trim: true, maxlength: 64 },
  continent: { type: String, default: '', trim: true, maxlength: 32 },
  continentCode: { type: String, default: '', trim: true, maxlength: 8 },
  callingCode: { type: String, default: '', trim: true, maxlength: 16 },
  connectionType: { type: String, default: '', trim: true, maxlength: 32 },
  isp: { type: String, default: '', trim: true, maxlength: 160 },
  organization: { type: String, default: '', trim: true, maxlength: 160 },
  locationStatus: {
    type: String,
    enum: ['pending', 'resolved', 'failed', 'skipped_private', 'skipped_bot'],
    default: 'pending',
  },
  locationError: { type: String, default: '', trim: true, maxlength: 240 },
  visitedAt: { type: Date, default: Date.now },
  pagePath: { type: String, default: '/', trim: true, maxlength: 500 },
  referrer: { type: String, default: '', trim: true, maxlength: 500 },
  userAgent: { type: String, default: '', trim: true, maxlength: 500 },
  sessionId: { type: String, default: '', trim: true, maxlength: 100 },
  eventId: { type: String, default: '', trim: true, maxlength: 100 },
}, { timestamps: true });

// No unique index on ipAddress: multiple visits from one address are expected.
visitorLocationSchema.index({ eventId: 1 }, { unique: true, sparse: true });
visitorLocationSchema.index({ createdAt: -1 });
visitorLocationSchema.index({ visitedAt: -1 });
visitorLocationSchema.index({ ipAddress: 1, createdAt: -1 });
visitorLocationSchema.index({ countryCode: 1, createdAt: -1 });
visitorLocationSchema.index({ sessionId: 1 });

// 90-day retention: raw visit records (incl. IP) auto-expire.
visitorLocationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const VisitorLocation = mongoose.models.VisitorLocation || mongoose.model('VisitorLocation', visitorLocationSchema);
