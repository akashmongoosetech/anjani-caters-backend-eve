import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import { seedAdmin } from './adminSeed.js';
import { seedSettings } from './settingsSeed.js';

async function runSeeder() {
  console.log('[Seeder] Connecting to database...');
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('[Seeder] Database connection failed. Aborting.');
    process.exit(1);
  }

  await seedAdmin();
  await seedSettings();

  console.log('[Seeder] Done.');
  process.exit(0);
}

runSeeder().catch((err) => {
  console.error('[Seeder] Failed:', err);
  process.exit(1);
});
