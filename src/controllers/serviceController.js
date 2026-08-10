import mongoose from 'mongoose';
import { Service } from '../models/Service.js';
import { Category } from '../models/Category.js';
import { SubCategory } from '../models/SubCategory.js';
import { ServiceFAQ } from '../models/ServiceFAQ.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { pick } from '../utils/pick.js';
import { safeSearchTerm } from '../utils/regexUtils.js';

const SERVICE_FIELDS = [
  'title', 'slug', 'shortDescription', 'fullDescription', 'image', 'icon',
  'category', 'categoryId', 'subCategoryId', 'featured', 'active', 'seoTitle', 'seoDescription', 'seoKeywords'
];

const SERVICE_POPULATE = [
  { path: 'categoryId', select: 'name slug status' },
  { path: 'subCategoryId', select: 'name slug status' },
];

const decorate = (services, faqCountMap = null) =>
  services.map((svc) => {
    const catName = svc.categoryId?.name || svc.category || 'General';
    return {
      ...svc,
      category: catName,
      categoryName: catName,
      categorySlug: svc.categoryId?.slug || '',
      subCategoryName: svc.subCategoryId?.name || '',
      subCategorySlug: svc.subCategoryId?.slug || '',
      faqCount: faqCountMap?.get(String(svc._id)) || 0,
    };
  });

const resolveCategoryFilter = async (category) => {
  if (!category || category === 'All') return null;
  if (mongoose.isValidObjectId(category)) return { categoryId: category };
  const found = await Category.findOne({ $or: [{ slug: category }, { name: category }] }).lean();
  if (found) return { categoryId: found._id };
  return { category: category };
};

const resolveSubCategoryFilter = async (subcategory, categoryFilter) => {
  if (!subcategory || subcategory === 'All') return null;
  if (mongoose.isValidObjectId(subcategory)) return { subCategoryId: subcategory };
  const found = await SubCategory.findOne({ slug: subcategory }).lean();
  if (found) {
    // If a category filter is active, only apply sub-categories that belong to it
    if (categoryFilter?.categoryId && String(found.categoryId) !== String(categoryFilter.categoryId)) {
      return null;
    }
    return { subCategoryId: found._id };
  }
  if (categoryFilter?.categoryId) {
    const byName = await SubCategory.findOne({ categoryId: categoryFilter.categoryId, name: subcategory }).lean();
    if (byName) return { subCategoryId: byName._id };
  }
  return null;
};

const normalizeId = (value) => {
  if (value === '' || value === undefined || value === null) return null;
  return String(value);
};

const validateCategoryRefs = async (body) => {
  const categoryId = normalizeId(body?.categoryId);
  const subCategoryId = normalizeId(body?.subCategoryId);

  if (subCategoryId && !categoryId) {
    return new ApiError(400, 'Please select a category before choosing a sub-category.');
  }

  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) {
      return new ApiError(400, 'Invalid category id');
    }
    const category = await Category.findById(categoryId).lean();
    if (!category) {
      return new ApiError(400, 'Selected category does not exist.');
    }
  }

  if (subCategoryId) {
    if (!mongoose.isValidObjectId(subCategoryId)) {
      return new ApiError(400, 'Invalid sub-category id');
    }
    const subCategory = await SubCategory.findById(subCategoryId).lean();
    if (!subCategory) {
      return new ApiError(400, 'Selected sub-category does not exist.');
    }
    if (categoryId && String(subCategory.categoryId) !== String(categoryId)) {
      return new ApiError(400, 'Selected sub-category does not belong to the selected category.');
    }
  }

  return null;
};

export const getServices = async (req, res, next) => {
  try {
    const { search, category, subcategory, categoryId, subCategoryId, featured, active, sortBy, page = '1', limit = '50' } = req.query;
    const query = {};
    if (search) {
      const q = safeSearchTerm(search);
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }
    if (categoryId) {
      if (mongoose.isValidObjectId(categoryId)) query.categoryId = categoryId;
    } else {
      const catFilter = await resolveCategoryFilter(category);
      if (catFilter) Object.assign(query, catFilter);
    }
    if (subCategoryId) {
      if (mongoose.isValidObjectId(subCategoryId)) query.subCategoryId = subCategoryId;
    } else if (subcategory) {
      const subFilter = await resolveSubCategoryFilter(subcategory, query);
      if (subFilter) Object.assign(query, subFilter);
    }
    if (featured !== undefined && featured !== '') query.featured = featured === 'true';
    if (active !== undefined && active !== '') query.active = active === 'true';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let sortObj = { createdAt: 1 };
    if (sortBy === 'latest') sortObj = { createdAt: -1 };
    else if (sortBy === 'oldest') sortObj = { createdAt: 1 };
    else if (sortBy === 'title') sortObj = { title: 1 };

    const [services, total, faqCounts] = await Promise.all([
      Service.find(query).populate(SERVICE_POPULATE).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Service.countDocuments(query),
      ServiceFAQ.aggregate([{ $match: { status: 'Active' } }, { $group: { _id: '$serviceId', count: { $sum: 1 } } }]),
    ]);
    const faqCountMap = new Map(faqCounts.map((f) => [String(f._id), f.count]));
    return res.status(200).json(new ApiResponse(200, {
      services: decorate(services, faqCountMap),
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
    const service = await Service.findOne({ slug }).populate(SERVICE_POPULATE).lean();
    if (!service) return next(new ApiError(404, 'Service not found'));
    return res.status(200).json(new ApiResponse(200, decorate([service])[0], 'Service details retrieved'));
  } catch (error) {
    next(error);
  }
};

export const createService = async (req, res, next) => {
  try {
    const body = pick(req.body, SERVICE_FIELDS);
    const validationError = await validateCategoryRefs(body);
    if (validationError) return next(validationError);
    const service = await Service.create(body);
    const populated = await Service.findById(service._id).populate(SERVICE_POPULATE).lean();
    return res.status(201).json(new ApiResponse(201, decorate([populated])[0], 'Service created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = pick(req.body, SERVICE_FIELDS);
    if (body.categoryId === '') body.categoryId = null;
    if (body.subCategoryId === '') body.subCategoryId = null;
    const validationError = await validateCategoryRefs(body);
    if (validationError) return next(validationError);
    const updated = await Service.findByIdAndUpdate(id, body, { new: true });
    if (!updated) return next(new ApiError(404, 'Service not found'));
    const populated = await Service.findById(updated._id).populate(SERVICE_POPULATE).lean();
    return res.status(200).json(new ApiResponse(200, decorate([populated])[0], 'Service updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid service id'));
    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) return next(new ApiError(404, 'Service not found'));
    await ServiceFAQ.deleteMany({ serviceId: id });
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
    await ServiceFAQ.deleteMany({ serviceId: { $in: validIds } });
    return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, 'Services deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteAllServices = async (req, res, next) => {
  try {
    const { search, category, subcategory, categoryId, subCategoryId, featured, active } = req.query;
    const query = {};
    if (search) {
      const q = safeSearchTerm(search);
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }
    if (categoryId) {
      if (mongoose.isValidObjectId(categoryId)) query.categoryId = categoryId;
    } else {
      const catFilter = await resolveCategoryFilter(category);
      if (catFilter) Object.assign(query, catFilter);
    }
    if (subCategoryId) {
      if (mongoose.isValidObjectId(subCategoryId)) query.subCategoryId = subCategoryId;
    } else if (subcategory) {
      const subFilter = await resolveSubCategoryFilter(subcategory, query);
      if (subFilter) Object.assign(query, subFilter);
    }
    if (featured !== undefined && featured !== '') query.featured = featured === 'true';
    if (active !== undefined && active !== '') query.active = active === 'true';
    const matched = await Service.find(query, { _id: 1 }).lean();
    const result = await Service.deleteMany(query);
    if (matched.length > 0) {
      await ServiceFAQ.deleteMany({ serviceId: { $in: matched.map((s) => s._id) } });
    }
    return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, 'All matching services deleted successfully'));
  } catch (error) {
    next(error);
  }
};
