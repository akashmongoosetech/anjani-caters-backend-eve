import { ROLES } from '../constants/roles.js';

const VALID_ROLES = Object.values(ROLES);

const ROLE_ALIASES = {
  'super admin': ROLES.SUPER_ADMIN,
  'super_admin': ROLES.SUPER_ADMIN,
  'superadmin': ROLES.SUPER_ADMIN,
  'admin': ROLES.ADMIN,
  'manager': ROLES.MANAGER,
  'staff': ROLES.STAFF,
  'employee': ROLES.STAFF,
  'user': ROLES.CUSTOMER,
  'client': ROLES.CUSTOMER,
  'customer': ROLES.CUSTOMER,
  'guest': ROLES.GUEST,
  '': ROLES.CUSTOMER
};

// Normalizes any incoming role string to a canonical, schema-valid enum value.
// Unknown or empty values fall back to the least-privileged role.
export function normalizeRole(role) {
  if (role === null || role === undefined) return ROLES.CUSTOMER;
  const clean = String(role).trim().toLowerCase();
  if (ROLE_ALIASES[clean]) return ROLE_ALIASES[clean];
  if (VALID_ROLES.includes(clean)) return clean;
  return ROLES.CUSTOMER;
}

export function isValidRole(role) {
  return VALID_ROLES.includes(String(role || '').toLowerCase());
}
