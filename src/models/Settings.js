import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Business identity
  companyName: { type: String, default: 'Anjani Catering & Events' },
  companyEmail: { type: String, default: 'sales@anjanievents.in' },
  companyPhone: { type: String, default: '+91-9685533878' },
  companyAddress: { type: String, default: 'Maharastra Marg, Rani ki Bagiya, Chhatarpur, MP 471001' },

  // Global SEO
  siteTitle: { type: String, default: 'Anjani Catering & Events — Best Caterer in Chhatarpur, MP' },
  siteDescription: { type: String, default: 'Anjani Catering & Events offers premium Indian wedding catering, grand celebration banquets, and bespoke live food stations in Chhatarpur, Madhya Pradesh, and across Bundelkhand.' },
  siteKeywords: { type: String, default: 'catering, wedding caterer, Chhatarpur, Bundelkhand, Indian catering, event management, MP caterer, Anjani Events' },
  siteLogo: { type: String, default: '' },
  favicon: { type: String, default: '' },

  // Social links
  facebookUrl: { type: String, default: 'https://www.facebook.com/anjanieventscatering/' },
  instagramUrl: { type: String, default: 'https://www.instagram.com/anjani_events__/' },
  linkedinUrl: { type: String, default: '' },
  youtubeUrl: { type: String, default: '' },

  // Verification & analytics
  googleVerification: { type: String, default: '-i0mdQZYNBta7fE0yMyrjSlz0O4qcw1nQtKdmG1PiY8' },
  bingVerification: { type: String, default: '' },
  googleAnalyticsId: { type: String, default: 'G-C1M79F0B9Q' },
  googleTagManagerId: { type: String, default: 'GTM-M27HQ7B7' },
  facebookPixelId: { type: String, default: '' },
  microsoftClarityId: { type: String, default: '' },

  // Open Graph / Social images
  ogImage: { type: String, default: '' },
  twitterImage: { type: String, default: '' },

  // Robots & canonical
  robotsContent: { type: String, default: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
  canonicalDomain: { type: String, default: 'https://anjanievents.in' },

  // Local SEO
  businessHours: { type: String, default: 'Monday - Saturday: 9:00 AM - 6:00 PM' },
  latitude: { type: Number, default: 24.9157 },
  longitude: { type: Number, default: 79.5833 },
  serviceArea: { type: [String], default: ['Chhatarpur', 'Bundelkhand', 'Madhya Pradesh', 'Khajuraho', 'Damoh', 'Panna', 'Tikamgarh', 'Sagar', 'Jabalpur', 'Bhopal', 'Indore'] },

  // Existing business fields
  taxRate: { type: Number, default: 8.5 },
  bookingDepositPercentage: { type: Number, default: 25 },
  notificationsEnabled: { type: Boolean, default: true },
  autoReplyEnabled: { type: Boolean, default: true },
  commentModeration: { type: Boolean, default: true }
}, { timestamps: true });

export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
