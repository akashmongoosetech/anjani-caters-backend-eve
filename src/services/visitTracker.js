import { VisitorLocation } from '../models/VisitorLocation.js';
import { lookupIp, normalizeIp, isGeolocatableIp } from './ipstackService.js';

const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i, /baidu/i,
  /yandex/i, /sogou/i, /exabot/i, /facebot/i, /ia_archiver/i, /semrush/i,
  /ahrefs/i, /mj12bot/i, /dotbot/i, /petalbot/i, /bytespider/i, /gptbot/i,
  /ccbot/i, /anthropic/i, /headless/i, /phantom/i, /selenium/i, /lighthouse/i,
];

export function isBotRequest(req) {
  const ua = String(req.headers?.['user-agent'] || '');
  if (!ua) return true;
  return BOT_PATTERNS.some((re) => re.test(ua));
}

// Server is the only source of truth for IP: Express `trust proxy` is set for
// the production proxy chain, so req.ip is used and client input is ignored.
export function getVisitorIp(req) {
  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

function sanitizeReferrer(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const v = raw.trim().slice(0, 500);
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      return `${u.protocol}//${u.host}${u.pathname}`.slice(0, 500);
    } catch {
      return '';
    }
  }
  return '';
}

// Creates the visit row synchronously (fast write, confirms persistence),
// then resolves geolocation in the background without delaying the response.
export async function recordVisit({ req, pagePath, referrer, sessionId, eventId }) {
  const ip = getVisitorIp(req);

  if (eventId) {
    const existing = await VisitorLocation.findOne({ eventId }).lean();
    if (existing) return { visit: existing, duplicate: true };
  }

  const doc = await VisitorLocation.create({
    ipAddress: ip,
    pagePath: String(pagePath || '/').slice(0, 500),
    referrer: sanitizeReferrer(referrer),
    userAgent: String(req.headers?.['user-agent'] || '').slice(0, 500),
    sessionId: String(sessionId || '').slice(0, 100),
    eventId: String(eventId || '').slice(0, 100),
    visitedAt: new Date(),
    locationStatus: 'pending',
  });

  // Background enrichment — never blocks or fails the request.
  resolveLocationInBackground(doc._id.toString(), ip).catch(() => {});

  return { visit: doc.toObject(), duplicate: false };
}

async function resolveLocationInBackground(id, ip) {
  try {
    if (!isGeolocatableIp(ip)) {
      await VisitorLocation.updateOne({ _id: id }, { $set: { locationStatus: 'skipped_private' } });
      return;
    }
    const result = await lookupIp(ip);
    if (result.data) {
      await VisitorLocation.updateOne(
        { _id: id },
        { $set: { ...result.data, ipAddress: ip, locationStatus: 'resolved' } },
      );
    } else {
      await VisitorLocation.updateOne(
        { _id: id },
        { $set: { locationStatus: 'failed', locationError: String(result.error || result.reason || 'lookup_failed').slice(0, 240) } },
      );
    }
  } catch (err) {
    try {
      await VisitorLocation.updateOne(
        { _id: id },
        { $set: { locationStatus: 'failed', locationError: String(err?.message || 'lookup_failed').slice(0, 240) } },
      );
    } catch {}
  }
}

// Admin-side soft anonymization: replaces the stored IP with a masked value.
export async function anonymizeVisitIp(id) {
  const visit = await VisitorLocation.findById(id).lean();
  if (!visit) return null;
  const masked = visit.ipAddress && visit.ipAddress.includes('.')
    ? visit.ipAddress.split('.').slice(0, 3).join('.') + '.0'
    : visit.ipAddress
      ? visit.ipAddress.split(':').slice(0, 4).join(':') + '::masked'
      : '';
  await VisitorLocation.updateOne({ _id: id }, { $set: { ipAddress: masked, ipAnonymized: true } });
  return masked;
}
