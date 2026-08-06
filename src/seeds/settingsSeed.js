import { Settings } from '../models/Settings.js';

export const seedSettings = async () => {
  try {
    const existing = await Settings.findOne().lean();
    if (existing) {
      console.log('[Seed] Settings already exist');
      return;
    }

    await Settings.create({
      companyName: 'Anjani Catering & Events',
      companyEmail: 'sales@anjanievents.in',
      companyPhone: '+91-9685533878',
      companyAddress: 'Maharastra Marg, Rani ki Bagiya, Chhatarpur, MP 471001',
      siteTitle: 'Anjani Catering & Events — Best Caterer in Chhatarpur, MP',
      siteDescription: 'Anjani Catering & Events offers premium Indian wedding catering, grand celebration banquets, and bespoke live food stations in Chhatarpur, Madhya Pradesh, and across Bundelkhand.',
      siteKeywords: 'catering, wedding caterer, Chhatarpur, Bundelkhand, Indian catering, event management, MP caterer, Anjani Events',
      facebookUrl: 'https://www.facebook.com/anjanieventscatering/',
      instagramUrl: 'https://www.instagram.com/anjani_events__/',
      linkedinUrl: '',
      youtubeUrl: '',
      googleVerification: '-i0mdQZYNBta7fE0yMyrjSlz0O4qcw1nQtKdmG1PiY8',
      googleAnalyticsId: 'G-C1M79F0B9Q',
      googleTagManagerId: 'GTM-M27HQ7B7',
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
    });

    console.log('[Seed] Default settings created');
  } catch (error) {
    console.error('[Seed] Failed to create settings:', error.message);
  }
};
