import { VisitorLocation } from '../models/VisitorLocation.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { safeSearchTerm } from '../utils/regexUtils.js';
import { pick } from '../utils/pick.js';
import { recordVisit, isBotRequest } from '../services/visitTracker.js';
import { getIpstackStats } from '../services/ipstackService.js';

const TRACK_FIELDS = ['pagePath', 'referrer', 'sessionId', 'eventId'];
const SORTABLE = ['latest', 'oldest'];

export const trackVisit = async (req, res, next) => {
  try {
    if (isBotRequest(req)) {
      return res.status(200).json(new ApiResponse(200, { tracked: false, reason: 'bot' }, 'Bot traffic is not recorded.'));
    }
    const body = pick(req.body, TRACK_FIELDS);
    const { visit, duplicate } = await recordVisit({
      req,
      pagePath: body.pagePath,
      referrer: body.referrer,
      sessionId: body.sessionId,
      eventId: body.eventId,
    });
    return res.status(duplicate ? 200 : 201).json(new ApiResponse(duplicate ? 200 : 201, {
      tracked: true,
      duplicate,
      id: visit._id,
      locationStatus: visit.locationStatus,
    }, duplicate ? 'Visit already recorded.' : 'Visit recorded.'));
  } catch (error) {
    next(error);
  }
};

function buildFilters(query) {
  const { search, country, pagePath, dateFrom, dateTo } = query;
  const filter = {};
  if (search) {
    const q = safeSearchTerm(search);
    filter.$or = [
      { city: { $regex: q, $options: 'i' } },
      { country: { $regex: q, $options: 'i' } },
      { region: { $regex: q, $options: 'i' } },
      { ipAddress: { $regex: q, $options: 'i' } },
    ];
  }
  if (country && country !== 'All') filter.countryCode = String(country).trim().slice(0, 8);
  if (pagePath && pagePath !== 'All') filter.pagePath = String(pagePath).trim().slice(0, 500);
  if (dateFrom || dateTo) {
    filter.visitedAt = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) filter.visitedAt.$gte = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        filter.visitedAt.$lte = to;
      }
    }
    if (Object.keys(filter.visitedAt).length === 0) delete filter.visitedAt;
  }
  return filter;
}

export const getVisits = async (req, res, next) => {
  try {
    const { sortBy = 'latest', page = 1, limit = 20 } = req.query;
    const filter = buildFilters(req.query);
    const sortOptions = SORTABLE.includes(sortBy) && sortBy === 'oldest' ? { visitedAt: 1 } : { visitedAt: -1 };
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      VisitorLocation.find(filter).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      VisitorLocation.countDocuments(filter),
    ]);
    return res.status(200).json(new ApiResponse(200, {
      visits: items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }, 'Visitor visits retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getVisitStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const [total, today, last7, uniqueSessions, topCountries, topCities] = await Promise.all([
      VisitorLocation.countDocuments({}),
      VisitorLocation.countDocuments({ visitedAt: { $gte: startOfToday } }),
      VisitorLocation.countDocuments({ visitedAt: { $gte: startOfWeek } }),
      VisitorLocation.distinct('sessionId', { sessionId: { $ne: '' } }).then((ids) => ids.length),
      VisitorLocation.aggregate([
        { $match: { country: { $ne: '' } } },
        { $group: { _id: { code: '$countryCode', name: '$country' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      VisitorLocation.aggregate([
        { $match: { city: { $ne: '' } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ]);

    return res.status(200).json(new ApiResponse(200, {
      total,
      today,
      last7Days: last7,
      uniqueSessions,
      topCountry: topCountries[0] ? { name: topCountries[0]._id.name, code: topCountries[0]._id.code, count: topCountries[0].count } : null,
      topCity: topCities[0] ? { name: topCities[0]._id, count: topCities[0].count } : null,
      provider: getIpstackStats(),
    }, 'Visitor statistics retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getVisitById = async (req, res, next) => {
  try {
    const visit = await VisitorLocation.findById(req.params.id).lean();
    if (!visit) return next(new ApiError(404, 'Visitor record not found'));
    return res.status(200).json(new ApiResponse(200, visit, 'Visitor record retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteVisit = async (req, res, next) => {
  try {
    const deleted = await VisitorLocation.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return next(new ApiError(404, 'Visitor record not found'));
    return res.status(200).json(new ApiResponse(200, { id: req.params.id }, 'Visitor record deleted'));
  } catch (error) {
    next(error);
  }
};

function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  // Formula-injection guard: prefix risky leading chars.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const exportVisits = async (req, res, next) => {
  try {
    const filter = buildFilters(req.query);
    const items = await VisitorLocation.find(filter).sort({ visitedAt: -1 }).limit(5000).lean();
    const header = ['visitedAt', 'ipAddress', 'country', 'countryCode', 'region', 'city', 'latitude', 'longitude', 'timezone', 'isp', 'pagePath', 'referrer', 'locationStatus'];
    const lines = [header.join(',')];
    for (const v of items) {
      lines.push(header.map((h) => csvCell(h === 'visitedAt' ? new Date(v[h]).toISOString() : v[h])).join(','));
    }
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="visitor-locations.csv"');
    return res.send(lines.join('\n'));
  } catch (error) {
    next(error);
  }
};
