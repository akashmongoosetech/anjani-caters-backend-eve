import { ApiResponse } from '../utils/apiResponse.js';

// Honeypot spam guard: legitimate clients leave `website` empty.
// Bots that fill it get a generic success without a DB write.
const HONEYPOT_FIELDS = ['website', 'company_website', 'url'];

export function checkHoneypot(req, res, next) {
  try {
    const body = req.body || {};
    const filled = HONEYPOT_FIELDS.some((f) => typeof body[f] === 'string' && body[f].trim() !== '');
    if (filled) {
      return res.status(200).json(new ApiResponse(200, { received: true }, 'Thank you for your submission.'));
    }
    next();
  } catch {
    next();
  }
}
