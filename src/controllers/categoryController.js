import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { SubCategory } from '../models/SubCategory.js';
import { Service } from '../models/Service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { slugify } from '../utils/slugify.js';
import { safeSearchTerm } from '../utils/regexUtils.js';

const CATEGORY_FIELDS = ['name', 'slug', 'description', 'image', 'status', 'displayOrder'];

const generateUniqueSlug = async (baseSlug, excludeId) => {
  const query = { slug: baseSlug };
  if (excludeId) query._id = { $ne: excludeId };
  if (mongoose.isValidObjectId(excludeId)) query._id = { $ne: excludeId };
  const existing = await Category.findOne(query).lean();
  if (!existing) return baseSlug;
  let i = 1;
  let candidate = `${baseSlug}-${i}`;
  while (await Category.findOne({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).lean()) {
    i += 1;
    candidate = `${baseSlug}-${i}`;
  }
  return candidate;
};

export const getCategories = async (req, res, next) => {
  try {
    const { search, status, sortBy = 'oldest', page = '1', limit = '10' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: safeSearchTerm(search), $options: 'i' } },
        { description: { $regex: safeSearchTerm(search), $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    let sortObj = { createdAt: 1 };
    if (sortBy === 'latest') sortObj = { createdAt: -1 };
    else if (sortBy === 'oldest') sortObj = { createdAt: 1 };
    else if (sortBy === 'name') sortObj = { name: 1 };
    else if (sortBy === 'displayOrder') sortObj = { displayOrder: 1, name: 1 };

    const [categories, total] = await Promise.all([
      Category.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Category.countDocuments(query),
    ]);

    // Attach child counts for admin insight
    const ids = categories.map((c) => c._id);
    const [subCounts, serviceCounts] = await Promise.all([
      SubCategory.aggregate([
        { $match: { categoryId: { $in: ids } } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
      Service.aggregate([
        { $match: { categoryId: { $in: ids } } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
    ]);
    const countMap = (rows) => Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
    const subMap = countMap(subCounts);
    const svcMap = countMap(serviceCounts);
    const enriched = categories.map((c) => ({
      ...c,
      subCategoryCount: subMap[c._id.toString()] || 0,
      serviceCount: svcMap[c._id.toString()] || 0,
    }));

    return res.status(200).json(new ApiResponse(200, {
      categories: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    }, 'Categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid category id'));
    const category = await Category.findById(id).lean();
    if (!category) return next(new ApiError(404, 'Category not found'));
    const [subCategoryCount, serviceCount] = await Promise.all([
      SubCategory.countDocuments({ categoryId: id }),
      Service.countDocuments({ categoryId: id }),
    ]);
    return res.status(200).json(new ApiResponse(200, {
      ...category,
      subCategoryCount,
      serviceCount,
    }, 'Category retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug }).lean();
    if (!category) return next(new ApiError(404, 'Category not found'));
    return res.status(200).json(new ApiResponse(200, category, 'Category retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const data = { ...req.body };
    const name = (data.name || '').toString().trim();
    if (!name) return next(new ApiError(400, 'Category name is required'));
    const slug = (data.slug || '').toString().trim().toLowerCase() || slugify(name);
    if (!slug) return next(new ApiError(400, 'Category slug is required'));
    const uniqueSlug = await generateUniqueSlug(slug);
    const category = await Category.create({
      name,
      slug: uniqueSlug,
      description: data.description || '',
      image: data.image || '',
      status: data.status || 'Active',
      displayOrder: Number(data.displayOrder) || 0,
    });
    return res.status(201).json(new ApiResponse(201, category, 'Category created successfully'));
  } catch (error) {
    if (error && error.code === 11000) {
      return next(new ApiError(400, 'Category slug already exists'));
    }
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid category id'));
    const existing = await Category.findById(id).lean();
    if (!existing) return next(new ApiError(404, 'Category not found'));

    const body = req.body || {};
    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) return next(new ApiError(400, 'Category name is required'));

    let slug = body.slug !== undefined ? String(body.slug).trim().toLowerCase() : existing.slug;
    if (!slug) slug = slugify(name);
    if (slug !== existing.slug) {
      slug = await generateUniqueSlug(slug, id);
    }

    const category = await Category.findByIdAndUpdate(id, {
      name,
      slug,
      description: body.description !== undefined ? body.description : existing.description,
      image: body.image !== undefined ? body.image : existing.image,
      status: body.status !== undefined ? body.status : existing.status,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : existing.displayOrder,
    }, { new: true, runValidators: true }).lean();
    if (!category) return next(new ApiError(404, 'Category not found'));

    // Keep denormalized display on existing services in sync when the name changes
    if (existing.name !== name) {
      await Service.updateMany({ categoryId: id }, { category: name }).catch(() => {});
    }

    return res.status(200).json(new ApiResponse(200, category, 'Category updated successfully'));
  } catch (error) {
    if (error && error.code === 11000) {
      return next(new ApiError(400, 'Category slug already exists'));
    }
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid category id'));
    const category = await Category.findById(id).lean();
    if (!category) return next(new ApiError(404, 'Category not found'));

    const [subCategoryCount, serviceCount] = await Promise.all([
      SubCategory.countDocuments({ categoryId: id }),
      Service.countDocuments({ categoryId: id }),
    ]);

    if (subCategoryCount > 0 || serviceCount > 0) {
      const parts = [];
      if (subCategoryCount > 0) parts.push(`${subCategoryCount} sub-categor${subCategoryCount === 1 ? 'y' : 'ies'}`);
      if (serviceCount > 0) parts.push(`${serviceCount} service${serviceCount === 1 ? '' : 's'}`);
      return next(new ApiError(400,
        `This category cannot be deleted because it contains ${parts.join(' and ')}. Reassign or delete them first.`));
    }

    await Category.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'Category deleted successfully'));
  } catch (error) {
    next(error);
  }
};
