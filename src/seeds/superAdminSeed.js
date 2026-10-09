import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { ROLES } from '../constants/roles.js';

// Env-driven one-shot super-admin seed. Never hardcode or log secrets.
// Required: ADMIN_PASSWORD (>= 8 chars, set in untracked .env or hosting dashboard)
// Optional: ADMIN_EMAIL (default sales@anjanievents.in), ADMIN_FIRST_NAME,
// ADMIN_LAST_NAME, ADMIN_MOBILE, ADMIN_USERNAME
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'sales@anjanievents.in').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const FIRST_NAME = (process.env.ADMIN_FIRST_NAME || 'Akash').trim();
const LAST_NAME = (process.env.ADMIN_LAST_NAME || 'Raikwar').trim();
const MOBILE = (process.env.ADMIN_MOBILE || '+919685533878').trim();
const USERNAME = (process.env.ADMIN_USERNAME || ADMIN_EMAIL).trim();

export const seedSuperAdmin = async () => {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('[Seed] ADMIN_PASSWORD is missing or too short (>= 8 chars required). Set it in the environment and retry. Nothing was written.');
    process.exitCode = 1;
    return null;
  }

  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('[Seed] Database connection failed. Aborting.');
    process.exitCode = 1;
    return null;
  }

  const name = `${FIRST_NAME} ${LAST_NAME}`.trim();
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);

  const update = {
    firstName: FIRST_NAME,
    lastName: LAST_NAME,
    name,
    email: ADMIN_EMAIL,
    username: USERNAME || undefined,
    mobile: MOBILE,
    password: hashedPassword,
    role: ROLES.SUPER_ADMIN,
    status: 'Active',
    verified: true,
    isDeleted: false,
  };

  const user = await User.findOneAndUpdate({ email: ADMIN_EMAIL }, { $set: update }, { new: true, upsert: true, runValidators: true }).lean();
  console.log(`[Seed] Super admin upserted: ${ADMIN_EMAIL} (role: ${ROLES.SUPER_ADMIN})`);
  return user;
};

const ranDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('src/seeds/superAdminSeed.js') ?? false;
if (ranDirectly) {
  seedSuperAdmin()
    .then(() => mongoose.disconnect())
    .then(() => process.exit(process.exitCode || 0))
    .catch(async (err) => {
      console.error(`[Seed] Failed: ${err.message}`);
      try { await mongoose.disconnect(); } catch {}
      process.exit(1);
    });
}
