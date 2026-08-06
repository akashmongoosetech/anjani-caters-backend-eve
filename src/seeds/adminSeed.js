import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { ROLES } from '../constants/roles.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sales@anjanievents.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Executive Admin';

export const seedAdmin = async () => {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`[Seed] Admin already exists: ${ADMIN_EMAIL}`);
      return;
    }

    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      username: ADMIN_EMAIL,
      mobile: '+91 96855 33878',
      password: hashedPassword,
      role: ROLES.SUPER_ADMIN,
      verified: true,
    });

    console.log(`[Seed] Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error(`[Seed] Failed to create admin: ${error.message}`);
  }
};
