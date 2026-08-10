import mongoose from 'mongoose';
import { Service } from '../models/Service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { pick } from '../utils/pick.js';
import { safeSearchTerm } from '../utils/regexUtils.js';

const SERVICE_FIELDS = [
  'title', 'slug', 'shortDescription', 'fullDescription', 'image', 'icon',
  'category', 'featured', 'active', 'seoTitle', 'seoDescription', 'seoKeywords'
];

export const getServices = async (req, res, next) => {
  try {
    const { search, category, featured, active, sortBy, page = '1', limit = '50' } = req.query;
    const query = {};
    if (search) {
      const q = safeSearchTerm(search);
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') query.category = category;
    if (featured !== undefined && featured !== '') query.featured = featured === 'true';
    if (active !== undefined && active !== '') query.active = active === 'true';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let sortObj = { createdAt: 1 };
    if (sortBy === 'latest') sortObj = { createdAt: -1 };
    else if (sortBy === 'oldest') sortObj = { createdAt: 1 };
    else if (sortBy === 'title') sortObj = { title: 1 };

    const [services, total] = await Promise.all([
      Service.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Service.countDocuments(query),
    ]);
    return res.status(200).json(new ApiResponse(200, {
      services,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    }, 'Services retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getServiceBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const service = await Service.findOne({ slug }).lean();
    if (!service) return next(new ApiError(404, 'Service not found'));
    return res.status(200).json(new ApiResponse(200, service, 'Service details retrieved'));
  } catch (error) {
    next(error);
  }
};

export const createService = async (req, res, next) => {
  try {
    const service = await Service.create(pick(req.body, SERVICE_FIELDS));
    return res.status(201).json(new ApiResponse(201, service, 'Service created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Service.findByIdAndUpdate(id, pick(req.body, SERVICE_FIELDS), { new: true });
    if (!updated) return next(new ApiError(404, 'Service not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Service updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Service.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'Service deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteServicesBulk = async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(new ApiResponse(400, null, 'ids must be a non-empty array'));
    }
    const MAX_BULK_DELETE = 500;
    if (ids.length > MAX_BULK_DELETE) {
      return res.status(400).json(new ApiResponse(400, null, `Cannot delete more than ${MAX_BULK_DELETE} services at once`));
    }
    const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) {
      return res.status(400).json(new ApiResponse(400, null, 'No valid service ids provided'));
    }
    const result = await Service.deleteMany({ _id: { $in: validIds } });
    return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, 'Services deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteAllServices = async (req, res, next) => {
  try {
    const { search, category, featured, active } = req.query;
    const query = {};
    if (search) {
      const q = safeSearchTerm(search);
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') query.category = category;
    if (featured !== undefined && featured !== '') query.featured = featured === 'true';
    if (active !== undefined && active !== '') query.active = active === 'true';
    const result = await Service.deleteMany(query);
    return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, 'All matching services deleted successfully'));
  } catch (error) {
    next(error);
  }
};
