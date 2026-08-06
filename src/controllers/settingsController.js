import { Settings } from '../models/Settings.js';
import { ApiResponse } from '../utils/apiResponse.js';

const defaultSettings = {
  companyName: 'Anjani Catering & Events',
  companyEmail: 'sales@anjanievents.in',
  companyPhone: '+91-9685533878',
  companyAddress: 'Maharastra Marg, Rani ki Bagiya, Chhatarpur, MP 471001',
  siteTitle: 'Anjani Catering & Events — Best Caterer in Chhatarpur, MP',
  siteDescription: 'Anjani Catering & Events offers premium Indian wedding catering, grand celebration banquets, and bespoke live food stations in Chhatarpur, Madhya Pradesh, and across Bundelkhand.',
  siteKeywords: 'catering, wedding caterer, Chhatarpur, Bundelkhand, Indian catering, event management, MP caterer, Anjani Events',
  siteLogo: '',
  favicon: '',
  facebookUrl: 'https://www.facebook.com/anjanieventscatering/',
  instagramUrl: 'https://www.instagram.com/anjani_events__/',
  linkedinUrl: '',
  youtubeUrl: '',
  googleVerification: '-i0mdQZYNBta7fE0yMyrjSlz0O4qcw1nQtKdmG1PiY8',
  bingVerification: '',
  googleAnalyticsId: 'G-C1M79F0B9Q',
  googleTagManagerId: 'GTM-M27HQ7B7',
  facebookPixelId: '',
  microsoftClarityId: '',
  ogImage: '',
  twitterImage: '',
  robotsContent: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  canonicalDomain: 'https://anjanievents.in',
  businessHours: 'Monday - Saturday: 9:00 AM - 6:00 PM',
  latitude: 24.9157,
  longitude: 79.5833,
  serviceArea: ['Chhatarpur', 'Bundelkhand', 'Madhya Pradesh', 'Khajuraho', 'Damoh', 'Panna', 'Tikamgarh', 'Sagar', 'Jabalpur', 'Bhopal', 'Indore'],
  taxRate: 8.5,
  bookingDepositPercentage: 25,
  notificationsEnabled: true,
  autoReplyEnabled: true,
  commentModeration: true
};

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne().lean().catch(() => null);
    if (!settings) settings = defaultSettings;
    return res.status(200).json(new ApiResponse(200, settings, 'Application settings retrieved'));
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const payload = req.body;
    let settings = await Settings.findOneAndUpdate({}, payload, { new: true, upsert: true, runValidators: true }).lean().catch(() => null);
    if (!settings) {
      settings = { ...defaultSettings, ...payload };
    }
    return res.status(200).json(new ApiResponse(200, settings, 'Application settings updated successfully'));
  } catch (error) {
    next(error);
  }
};
