import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Service } from '../src/models/Service.js';

function toSlug(text) {
  return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const featuredServices = new Set([
  'Wedding Planning', 'Engagement Ceremony', 'Reception Planning', 'Birthday Party Management',
  'Vegetarian Catering', 'Non-Vegetarian Catering', 'Venue Booking', 'Stage Decoration',
  'Floral Decoration', 'Photography', 'Videography', 'DJ', 'Live Band', 'Sound System',
  'Wedding Decoration', 'Destination Weddings', 'Conferences', 'Product Launches',
  'Tent Booking', 'Lighting Decoration', 'Mandap Decoration', 'Theme Decoration',
  'Live Food Counters', 'BBQ & Grill', 'Sweet Counter', 'Chaat Counter',
  'Event Manager', 'Menu Planning', 'Bridal Dressing', 'Cinematic Wedding Film',
  'Baraat Management', 'Luxury Car Booking', 'Pre-Wedding Shoot', 'Fireworks',
  'Laser Show', 'Celebrity Booking', 'North Indian Cuisine', 'Continental Cuisine'
]);

const shortDescTemplates = {
  'Event Planning Services': (t) => `Professional ${t.toLowerCase()} services for unforgettable events.`,
  'Wedding Planning': (t) => `Comprehensive ${t.toLowerCase()} tailored to your vision and budget.`,
  'Engagement Ceremony': () => `Beautiful engagement ceremony planning with personalized themes and seamless execution.`,
  'Reception Planning': () => `Grand reception planning with exquisite decor, entertainment, and gourmet catering.`,
  'Birthday Party Management': () => `Creative birthday party management for all ages with custom themes and entertainment.`,
  'Anniversary Celebration': () => `Elegant anniversary celebration services to honor your special milestone.`,
  'Baby Shower': () => `Charming baby shower arrangements with themed decor, games, and refreshments.`,
  'Naming Ceremony': () => `Traditional naming ceremony coordination with religious rituals and family gatherings.`,
  'Housewarming (Griha Pravesh)': () => `Blessings and celebrations with complete housewarming event management.`,
  'Religious Events (Puja, Bhajan, Yagna)': () => `Sacred religious event arrangements including puja, bhajan, and yagna ceremonies.`,
  'Meal Services': (t) => `Convenient and delicious ${t.toLowerCase()} for events of all sizes.`,
  default: (t) => `Expert ${t.toLowerCase()} services by Anjani Catering & Events.`,
};

function genShortDesc(category, title) {
  const fn = shortDescTemplates[title] || shortDescTemplates[category] || shortDescTemplates.default;
  return fn(title);
}

function genFullDesc(category, title) {
  const base = `At Anjani Catering & Events, we specialize in delivering exceptional ${category.toLowerCase()} tailored to your unique requirements. Our ${title.toLowerCase()} service is designed to provide a seamless and memorable experience for you and your guests.`;
  const mid = `With years of expertise in the Indian events industry, our dedicated team ensures every detail is meticulously planned and executed. From conceptualization to execution, we bring creativity, precision, and passion to every project we undertake.`;
  const close = `We pride ourselves on using the finest resources, professional staff, and innovative techniques to deliver results that exceed expectations. Whether it's an intimate gathering or a large-scale celebration, our ${title.toLowerCase()} service is crafted to perfection. Contact Anjani Catering & Events to discuss your requirements and let us create something extraordinary together.`;
  return `${base}\n\n${mid}\n\n${close}`;
}

function genSeoTitle(category, title) {
  return `${title} | ${category} | Anjani Catering & Events`;
}

function genSeoDescription(category, title) {
  return `Professional ${title.toLowerCase()} services by Anjani Catering & Events. Expert ${category.toLowerCase()} for events in Chhatarpur and across India. Contact us for customized ${title.toLowerCase()} solutions.`;
}

function genSeoKeywords(title, category) {
  const kw = new Set();
  kw.add(title.toLowerCase());
  kw.add(`${title.toLowerCase()} services`);
  kw.add(`${title.toLowerCase()} near me`);
  kw.add(`${category.toLowerCase().replace(/ & /g, ' ')}`);
  kw.add(`Anjani Catering & Events`);
  kw.add(`event management company`);
  kw.add(`catering services`);
  kw.add(`event planning`);
  kw.add(`${title.toLowerCase()} in Chhatarpur`);
  kw.add(`${title.toLowerCase()} in MP`);
  return [...kw];
}

function getImagePath(slug) {
  return `/uploads/services/${slug}.webp`;
}

function isFeatured(title) {
  return featuredServices.has(title);
}

const serviceCategories = {
  'Event Planning Services': [
    'Wedding Planning',
    'Engagement Ceremony',
    'Reception Planning',
    'Birthday Party Management',
    'Anniversary Celebration',
    'Baby Shower',
    'Naming Ceremony',
    'Housewarming (Griha Pravesh)',
    'Religious Events (Puja, Bhajan, Yagna)'
  ],
  'Corporate Events': [
    'Product Launches',
    'Conferences',
    'Seminars',
    'Annual Day Events',
    'Award Functions',
    'Cultural Programs',
    'College & School Events',
    'Sports Events',
    'Government Events',
    'Political Events',
    'Fashion Shows',
    'Concerts',
    'Exhibitions & Trade Shows',
    'Charity Events',
    'Destination Weddings'
  ],
  'Catering Services': [
    'Vegetarian Catering',
    'Non-Vegetarian Catering',
    'Jain Food Catering',
    'Vegan Catering',
    'South Indian Cuisine',
    'North Indian Cuisine',
    'Chinese Cuisine',
    'Italian Cuisine',
    'Continental Cuisine',
    'Mexican Cuisine',
    'Mughlai Cuisine',
    'Gujarati Catering',
    'Rajasthani Catering',
    'Bengali Catering',
    'Maharashtrian Catering',
    'Punjabi Catering'
  ],
  'Live Food Counters': [
    'Live Food Counters',
    'BBQ & Grill',
    'Sweet Counter',
    'Chaat Counter',
    'Mocktail Counter',
    'Dessert Counter',
    'Ice Cream Counter',
    'Bakery Services',
    'Tea & Coffee Counter'
  ],
  'Meal Services': [
    'Breakfast Catering',
    'Lunch Catering',
    'Dinner Catering',
    'Corporate Meal Boxes',
    'Packed Food Services'
  ],
  'Venue Services': [
    'Venue Booking',
    'Banquet Hall Booking',
    'Farmhouse Booking',
    'Resort Booking',
    'Hotel Booking',
    'Lawn Booking',
    'Convention Hall Booking',
    'Outdoor Venue Booking',
    'Tent Booking'
  ],
  'Decoration Services': [
    'Stage Decoration',
    'Floral Decoration',
    'Mandap Decoration',
    'Balloon Decoration',
    'Theme Decoration',
    'Lighting Decoration',
    'Entrance Decoration',
    'Table Decoration',
    'Ceiling Decoration',
    'Garden Decoration',
    'Reception Decoration',
    'Birthday Decoration',
    'Wedding Decoration'
  ],
  'Photography & Videography': [
    'Photography',
    'Videography',
    'Cinematic Wedding Film',
    'Drone Photography',
    'Drone Videography',
    'Live Streaming',
    'LED Screen Recording',
    'Instant Photo Printing',
    'Pre-Wedding Shoot',
    'Post-Wedding Shoot'
  ],
  'Entertainment Services': [
    'DJ',
    'Live Band',
    'Orchestra',
    'Singer',
    'Dancers',
    'Celebrity Booking',
    'Anchor (Emcee)',
    'Magician',
    'Puppet Show',
    'Kids Entertainment',
    'Fireworks',
    'Laser Show',
    'Folk Dance',
    'Cultural Performance'
  ],
  'Sound & Lighting': [
    'Sound System',
    'PA System',
    'Microphones',
    'Stage Lighting',
    'LED Wall',
    'Projector',
    'Audio Mixing',
    'Generator Backup',
    'Smoke Machine',
    'Special Effects'
  ],
  'Wedding Management': [
    'Wedding Planning',
    'Guest Management',
    'Invitation Management',
    'RSVP Tracking',
    'Bridal Entry',
    'Groom Entry',
    'Baraat Management',
    'Mandap Setup',
    'Wedding Timeline',
    'Ritual Coordination'
  ],
  'Corporate Event Services': [
    'Conference Management',
    'Seminar Management',
    'Training Programs',
    'Team Building Activities',
    'Employee Engagement',
    'Dealer Meets',
    'Product Launch',
    'Business Expo',
    'Award Ceremony',
    'Annual Meet'
  ],
  'Invitation Services': [
    'Printed Invitation Cards',
    'Digital Invitations',
    'WhatsApp Invitations',
    'Email Invitations',
    'QR Code Invitations'
  ],
  'Guest Management': [
    'RSVP Management',
    'Guest Registration',
    'Guest Check-in',
    'QR Code Entry',
    'VIP Guest Management',
    'Seating Arrangement',
    'Accommodation Management',
    'Welcome Kit Distribution',
    'Transport Coordination'
  ],
  'Transportation Services': [
    'Guest Pickup',
    'Guest Drop',
    'Bus Booking',
    'Luxury Car Booking',
    'Taxi Arrangement',
    'Airport Transfers',
    'Valet Parking'
  ],
  'Accommodation Services': [
    'Hotel Booking',
    'Room Allocation',
    'Check-in Management',
    'Guest Stay Tracking'
  ],
  'Rental Services': [
    'Chairs',
    'Tables',
    'Sofa',
    'Stage',
    'Tent',
    'AC Coolers',
    'Air Conditioners',
    'Generator',
    'Crockery',
    'Cutlery',
    'Glassware',
    'Linen',
    'Furniture',
    'Dance Floor'
  ],
  'Event Staffing': [
    'Event Manager',
    'Coordinator',
    'Catering Staff',
    'Waiters',
    'Chefs',
    'Bartenders (where permitted)',
    'Housekeeping',
    'Security Guards',
    'Valet Staff',
    'Helpers',
    'Volunteers'
  ],
  'Kitchen Management': [
    'Menu Planning',
    'Recipe Management',
    'Ingredient Management',
    'Food Cost Calculation',
    'Kitchen Production',
    'Waste Management',
    'Quality Control'
  ],
  'Additional Value-Added Services': [
    'Mehendi Artists',
    'Makeup Artists',
    'Hair Stylists',
    'Bridal Dressing',
    'Return Gifts',
    'Gift Packaging',
    'Chocolate Counter',
    'Fruit Counter',
    'Live Cooking Stations',
    'Coffee Bar',
    'Tea Stall',
    'Kids Play Zone',
    'Photo Booth',
    'Selfie Point',
    'LED Dance Floor',
    'Fire Safety',
    'Event Insurance',
    'Security Services',
    'Sanitization Services'
  ]
};

async function seedServices() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB\n');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;

  const seenSlugs = new Set();

  for (const [category, services] of Object.entries(serviceCategories)) {
    for (let i = 0; i < services.length; i++) {
      const title = services[i];
      const slug = toSlug(title);

      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const existing = await Service.findOne({ slug });
      if (existing) {
        skipped++;
        continue;
      }

      const shortDescription = genShortDesc(category, title);
      const fullDescription = genFullDesc(category, title);
      const seoTitle = genSeoTitle(category, title);
      const seoDescription = genSeoDescription(category, title);
      const seoKeywords = genSeoKeywords(title, category);

      await Service.create({
        title,
        slug,
        shortDescription,
        fullDescription,
        image: getImagePath(slug),
        icon: getImagePath(slug),
        category,
        featured: isFeatured(title),
        active: true,
        seoTitle,
        seoDescription,
        seoKeywords
      });

      inserted++;
    }
  }

  console.log(`\nSeed Summary:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total:    ${inserted + skipped}\n`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  process.exit(0);
}

seedServices();
