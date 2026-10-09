// Reusable IPstack geolocation service.
// Free plan uses HTTP (HTTPS requires a paid plan) — key stays server-side only.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 2000;
const REQUEST_TIMEOUT_MS = 5000;

const cache = new Map(); // ip -> { data, expiresAt }
const stats = { lookups: 0, cacheHits: 0, failures: 0, lastError: '' };

function baseUrl() {
  return (process.env.IPSTACK_BASE_URL || 'http://api.ipstack.com').replace(/\/$/, '');
}

function pruneCache() {
  if (cache.size <= CACHE_MAX) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
    if (cache.size <= CACHE_MAX) return;
  }
  // Still over limit: drop oldest inserts first.
  const overflow = cache.size - CACHE_MAX;
  let i = 0;
  for (const k of cache.keys()) {
    cache.delete(k);
    if (++i >= overflow) break;
  }
}

function unwrapIp(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let ip = raw.trim();
  // Express may give a list if misconfigured — take the first entry.
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  // Strip IPv6 zone id.
  const pct = ip.indexOf('%');
  if (pct !== -1) ip = ip.slice(0, pct);
  // Unwrap IPv4-mapped IPv6.
  if (ip.toLowerCase().startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

function ipv4ToInt(ip) {
  const p = ip.split('.');
  if (p.length !== 4) return -1;
  let n = 0;
  for (const part of p) {
    if (!/^\d{1,3}$/.test(part)) return -1;
    const v = Number(part);
    if (v > 255) return -1;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function inRange(ip, cidr, mask) {
  const a = ipv4ToInt(ip);
  const b = ipv4ToInt(cidr);
  if (a < 0 || b < 0) return false;
  const m = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
  return (a & m) === (b & m);
}

// True when the address can never be geolocated (loopback, private, link-local,
// multicast, reserved, CGNAT, documentation ranges). Never call IPstack for these.
export function isGeolocatableIp(raw) {
  const ip = unwrapIp(raw);
  if (!ip) return false;
  if (ip === '::1') return false;
  if (ip.includes(':')) {
    const low = ip.toLowerCase();
    if (low === '::' || low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd') || low.startsWith('ff')) return false;
    return true;
  }
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  if (ip.startsWith('127.') || ip.startsWith('169.254.') || ip.startsWith('192.0.2.') ||
      ip.startsWith('198.51.100.') || ip.startsWith('203.0.113.') || ip.startsWith('0.') ||
      inRange(ip, '10.0.0.0', 8) || inRange(ip, '172.16.0.0', 12) || inRange(ip, '192.168.0.0', 16) ||
      inRange(ip, '100.64.0.0', 10) || inRange(ip, '224.0.0.0', 4) || inRange(ip, '240.0.0.0', 4)) {
    return false;
  }
  return true;
}

export function normalizeIp(raw) {
  return unwrapIp(raw);
}

function normalizeResponse(ip, json) {
  return {
    ipAddress: ip,
    country: json.country_name || '',
    countryCode: json.country_code || '',
    region: json.region_name || '',
    regionCode: json.region_code || '',
    city: json.city || '',
    zip: json.zip || '',
    latitude: typeof json.latitude === 'number' ? json.latitude : null,
    longitude: typeof json.longitude === 'number' ? json.longitude : null,
    timezone: json.time_zone?.id || '',
    continent: json.continent_name || '',
    continentCode: json.continent_code || '',
    callingCode: json.calling_code || '',
    connectionType: json.connection?.type || '',
    isp: json.connection?.isp || '',
    organization: json.connection?.organization || '',
  };
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupIp(rawIp) {
  const ip = unwrapIp(rawIp);
  if (!isGeolocatableIp(ip)) return { eligible: false, reason: 'non_geolocatable' };

  const now = Date.now();
  const hit = cache.get(ip);
  if (hit && hit.expiresAt > now) {
    stats.cacheHits += 1;
    return { eligible: true, cached: true, data: hit.data };
  }

  const apiKey = process.env.IPSTACK_API_KEY;
  if (!apiKey || apiKey === 'YOUR_IPSTACK_API_KEY') {
    stats.failures += 1;
    stats.lastError = 'missing_key';
    return { eligible: true, cached: false, error: 'missing_key' };
  }

  // Request only the fields we persist — smaller payload, same data.
  const fields = [
    'ip', 'type', 'country_code', 'country_name', 'region_code', 'region_name',
    'city', 'zip', 'latitude', 'longitude', 'time_zone',
    'continent_code', 'continent_name', 'calling_code', 'connection',
  ].join(',');
  const url = `${baseUrl()}/${encodeURIComponent(ip)}?access_key=${encodeURIComponent(apiKey)}&fields=${encodeURIComponent(fields)}`;
  let lastErr = '';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      stats.lookups += 1;
      const res = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
      const json = await res.json().catch(() => ({}));
      if (json && json.error) {
        // 101 invalid key, 104 quota/usage limit, 105 https not allowed on plan.
        lastErr = `ipstack_${json.error.code || 'error'}`;
        stats.failures += 1;
        stats.lastError = lastErr;
        return { eligible: true, cached: false, error: lastErr };
      }
      if (!res.ok) {
        lastErr = `http_${res.status}`;
        continue; // retry transient HTTP errors once
      }
      const data = normalizeResponse(ip, json || {});
      cache.set(ip, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      pruneCache();
      return { eligible: true, cached: false, data };
    } catch (err) {
      lastErr = err?.name === 'AbortError' ? 'timeout' : 'network';
      // Retry once on timeout/network only.
    }
  }
  stats.failures += 1;
  stats.lastError = lastErr || 'lookup_failed';
  return { eligible: true, cached: false, error: stats.lastError };
}

export function getIpstackStats() {
  return { ...stats, cacheSize: cache.size };
}

export function logIpstackHealth() {
  if (process.env.IPSTACK_API_KEY && process.env.IPSTACK_API_KEY !== 'YOUR_IPSTACK_API_KEY') {
    console.log(`[IPstack] API key configured (${baseUrl()}).`);
  } else {
    console.warn('[IPstack] IPSTACK_API_KEY missing or placeholder — visits will be recorded without location.');
  }
}
