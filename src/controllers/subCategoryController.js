import mongoose from 'mongoose';
import { SubCategory } from '../models/SubCategory.js';
import { Category } from '../models/Category.js';
import { Service } from '../models/Service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { slugify } from '../utils/slugify.js';
import { safeSearchTerm } from '../utils/regexUtils.js';

const SUB_CATEGORY_FIELDS = ['categoryId', 'name', 'slug', 'description', 'image', 'status', 'displayOrder'];

const generateUniqueSlug = async (baseSlug, excludeId) => {
  const query = excludeId && mongoose.isValidObjectId(excludeId)
    ? { slug: baseSlug, _id: { $ne: excludeId } }
    : { slug: baseSlug };
  const existing = await SubCategory.findOne(query).lean();
  if (!existing) return baseSlug;
  let i = 1;
  let candidate = `${baseSlug}-${i}`;
  while (await SubCategory.findOne({ slug: candidate, ...(excludeId && mongoose.isValidObjectId(excludeId) ? { _id: { $ne: excludeId } } : {}) }).lean()) {
    i += 1;
    candidate = `${baseSlug}-${i}`;
  }
  return candidate;
};

const assertCategoryExists = async (categoryId) => {
  if (!mongoose.isValidObjectId(categoryId)) {
    return new ApiError(400, 'Invalid category id');
  }
  const category = await Category.findById(categoryId).lean();
  if (!category) return new ApiError(404, 'Selected category does not exist');
  return null;
};

export const getSubCategories = async (req, res, next) => {
  try {
    const { search, categoryId, status, sortBy = 'oldest', page = '1', limit = '10' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: safeSearchTerm(search), $options: 'i' } },
        { description: { $regex: safeSearchTerm(search), $options: 'i' } },
      ];
    }
    if (categoryId && categoryId !== 'All') {
      if (!mongoose.isValidObjectId(categoryId)) return next(new ApiError(400, 'Invalid category id'));
      query.categoryId = categoryId;
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

    const [subCategories, total] = await Promise.all([
      SubCategory.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      SubCategory.countDocuments(query),
    ]);

    const populated = await SubCategory.populate(subCategories, { path: 'categoryId', select: 'name slug status' });

    const ids = populated.map((s) => s._id);
    const serviceRows = await Service.aggregate([
      { $match: { subCategoryId: { $in: ids } } },
      { $group: { _id: '$subCategoryId', count: { $sum: 1 } } },
    ]);
    const svcMap = Object.fromEntries(serviceRows.map((r) => [r._id.toString(), r.count]));
    const enriched = populated.map((s) => ({
      ...s,
      category: s.categoryId || null,
      serviceCount: svcMap[s._id.toString()] || 0,
    }));

    return res.status(200).json(new ApiResponse(200, {
      subCategories: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    }, 'Sub-categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSubCategoriesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.isValidObjectId(categoryId)) return next(new ApiError(400, 'Invalid category id'));
    const { status, search, sortBy = 'displayOrder', limit = '100' } = req.query;
    const query = { categoryId };
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.name = { $regex: safeSearchTerm(search), $options: 'i' };
    }
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    let sortObj = { displayOrder: 1, name: 1 };
    if (sortBy === 'latest') sortObj = { createdAt: -1 };
    else if (sortBy === 'name') sortObj = { name: 1 };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SubCategories] Fetching for categoryId=${categoryId} query=${JSON.stringify(query)} limit=${limitNum}`);
    }

    const subCategories = await SubCategory.find(query).sort(sortObj).limit(limitNum).lean();

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SubCategories] Found ${subCategories.length} sub-categories for categoryId=${categoryId}`);
    }

    return res.status(200).json(new ApiResponse(200, { subCategories, total: subCategories.length }, 'Sub-categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSubCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid sub-category id'));
    const subCategory = await SubCategory.findById(id).lean();
    if (!subCategory) return next(new ApiError(404, 'Sub-category not found'));
    const populated = await SubCategory.populate(subCategory, { path: 'categoryId', select: 'name slug status' });
    const serviceCount = await Service.countDocuments({ subCategoryId: id });
    return res.status(200).json(new ApiResponse(200, {
      ...populated,
      category: populated.categoryId || null,
      serviceCount,
    }, 'Sub-category retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSubCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const subCategory = await SubCategory.findOne({ slug }).lean();
    if (!subCategory) return next(new ApiError(404, 'Sub-category not found'));
    return res.status(200).json(new ApiResponse(200, subCategory, 'Sub-category retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createSubCategory = async (req, res, next) => {
  try {
    const data = { ...req.body };
    const name = (data.name || '').toString().trim();
    if (!name) return next(new ApiError(400, 'Sub-category name is required'));
    if (!data.categoryId) return next(new ApiError(400, 'Category is required'));
    const categoryError = await assertCategoryExists(data.categoryId);
    if (categoryError) return next(categoryError);

    const slug = (data.slug || '').toString().trim().toLowerCase() || slugify(name);
    if (!slug) return next(new ApiError(400, 'Sub-category slug is required'));
    const uniqueSlug = await generateUniqueSlug(slug);

    const subCategory = await SubCategory.create({
      categoryId: data.categoryId,
      name,
      slug: uniqueSlug,
      description: data.description || '',
      image: data.image || '',
      status: data.status || 'Active',
      displayOrder: Number(data.displayOrder) || 0,
    });
    return res.status(201).json(new ApiResponse(201, subCategory, 'Sub-category created successfully'));
  } catch (error) {
    if (error && error.code === 11000) {
      return next(new ApiError(400, 'Sub-category slug already exists'));
    }
    next(error);
  }
};

export const updateSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid sub-category id'));
    const existing = await SubCategory.findById(id).lean();
    if (!existing) return next(new ApiError(404, 'Sub-category not found'));

    const body = req.body || {};
    if (body.categoryId !== undefined && String(body.categoryId) !== String(existing.categoryId)) {
      const categoryError = await assertCategoryExists(body.categoryId);
      if (categoryError) return next(categoryError);
    }

    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) return next(new ApiError(400, 'Sub-category name is required'));

    let slug = body.slug !== undefined ? String(body.slug).trim().toLowerCase() : existing.slug;
    if (!slug) slug = slugify(name);
    if (slug !== existing.slug) {
      slug = await generateUniqueSlug(slug, id);
    }

    const subCategory = await SubCategory.findByIdAndUpdate(id, {
      categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
      name,
      slug,
      description: body.description !== undefined ? body.description : existing.description,
      image: body.image !== undefined ? body.image : existing.image,
      status: body.status !== undefined ? body.status : existing.status,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : existing.displayOrder,
    }, { new: true, runValidators: true }).lean();
    if (!subCategory) return next(new ApiError(404, 'Sub-category not found'));

    return res.status(200).json(new ApiResponse(200, subCategory, 'Sub-category updated successfully'));
  } catch (error) {
    if (error && error.code === 11000) {
      return next(new ApiError(400, 'Sub-category slug already exists'));
    }
    next(error);
  }
};

export const deleteSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid sub-category id'));
    const subCategory = await SubCategory.findById(id).lean();
    if (!subCategory) return next(new ApiError(404, 'Sub-category not found'));

    const serviceCount = await Service.countDocuments({ subCategoryId: id });
    if (serviceCount > 0) {
      return next(new ApiError(400,
        `This sub-category cannot be deleted because it contains ${serviceCount} service${serviceCount === 1 ? '' : 's'}. Reassign or delete them first.`));
    }

    await SubCategory.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'Sub-category deleted successfully'));
  } catch (error) {
    next(error);
  }
};
