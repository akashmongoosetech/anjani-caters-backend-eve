import { Service } from '../models/Service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getServices = async (req, res, next) => {
  try {
    const { search, category, featured, active, sortBy, page = '1', limit = '50' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
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
    const service = await Service.create(req.body);
    return res.status(201).json(new ApiResponse(201, service, 'Service created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Service.findByIdAndUpdate(id, req.body, { new: true });
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
