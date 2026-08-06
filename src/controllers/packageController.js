import { Package } from '../models/Package.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getPackages = async (req, res, next) => {
  try {
    const { search, status, featured, popular, sortBy = 'latest', page = 1, limit = 10 } = req.query;

    const query = {};
    if (search) {
      const q = String(search);
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (featured !== undefined && featured !== '') query.featured = String(featured) === 'true';
    if (popular !== undefined && popular !== '') query.popular = String(popular) === 'true';

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
    else if (sortBy === 'name') sortOptions = { name: 1 };
    else if (sortBy === 'price') sortOptions = { price: 1 };

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Package.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Package.countDocuments(query),
    ]);

    return res.status(200).json(new ApiResponse(200, {
      packages: items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }, 'Packages retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getPackageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pkg = await Package.findById(id).lean();
    if (!pkg) return next(new ApiError(404, 'Package not found'));
    return res.status(200).json(new ApiResponse(200, pkg, 'Package retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createPackage = async (req, res, next) => {
  try {
    const pkg = await Package.create(req.body);
    return res.status(201).json(new ApiResponse(201, pkg, 'Package created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Package.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();
    if (!updated) return next(new ApiError(404, 'Package not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Package updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deletePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Package.findByIdAndDelete(id);
    if (!deleted) return next(new ApiError(404, 'Package not found'));
    return res.status(200).json(new ApiResponse(200, { id }, 'Package deleted successfully'));
  } catch (error) {
    next(error);
  }
};
