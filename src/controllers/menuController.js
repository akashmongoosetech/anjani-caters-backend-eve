import mongoose from 'mongoose';
import { MenuItem } from '../models/MenuItem.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getMenuItems = async (req, res, next) => {
  try {
    const {
      search,
      category,
      cuisine,
      dietary,
      status,
      featured,
      popular,
      chefSpecial,
      sortBy = 'latest',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (search) {
      const q = String(search);
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { cuisine: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') filter.category = category;
    if (cuisine && cuisine !== 'All') filter.cuisine = cuisine;
    if (dietary && dietary !== 'All') filter.dietary = dietary;
    if (status && status !== 'All') filter.status = status;

    if (featured !== undefined && featured !== '') {
      filter.featured = String(featured) === 'true';
    }
    if (popular !== undefined && popular !== '') {
      filter.popular = String(popular) === 'true';
    }
    if (chefSpecial !== undefined && chefSpecial !== '') {
      filter.chefSpecial = String(chefSpecial) === 'true';
    }

    let sort = {};
    if (sortBy === 'latest') sort = { createdAt: -1 };
    else if (sortBy === 'oldest') sort = { createdAt: 1 };
    else if (sortBy === 'name') sort = { name: 1 };
    else if (sortBy === 'category') sort = { category: 1 };
    else if (sortBy === 'price') sort = { price: 1 };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);

    const [items, total, categories] = await Promise.all([
      MenuItem.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      MenuItem.countDocuments(filter),
      MenuItem.distinct('category'),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json(new ApiResponse(200, {
      items,
      total,
      page: pageNum,
      totalPages,
      categories: categories.sort(),
    }, 'Menu items retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getMenuItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findById(id).lean();
    if (!item) {
      return next(new ApiError(404, 'Menu item not found'));
    }
    return res.status(200).json(new ApiResponse(200, item, 'Menu item fetched successfully'));
  } catch (error) {
    next(error);
  }
};

export const createMenuItem = async (req, res, next) => {
  try {
    const body = req.body;
    const item = await MenuItem.create({
      name: body.name,
      category: body.category || 'Welcome Drinks',
      cuisine: body.cuisine || 'Multi Cuisine',
      dietary: body.dietary || 'Veg',
      description: body.description || '',
      price: Number(body.price) || 200,
      image: body.image || '',
      popular: Boolean(body.popular),
      chefSpecial: Boolean(body.chefSpecial),
      featured: Boolean(body.featured),
      displayOrder: Number(body.displayOrder) || 0,
      status: body.status || 'Active',
    });

    return res.status(201).json(new ApiResponse(201, item, 'Dish added successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const allowedFields = [
      'name', 'category', 'cuisine', 'dietary', 'description', 'price',
      'image', 'popular', 'chefSpecial', 'featured', 'displayOrder', 'status'
    ];
    const update = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const updated = await MenuItem.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!updated) {
      return next(new ApiError(404, 'Dish not found'));
    }

    return res.status(200).json(new ApiResponse(200, updated, 'Dish updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await MenuItem.findByIdAndDelete(id).lean();
    if (!deleted) {
      return next(new ApiError(404, 'Dish not found'));
    }

    return res.status(200).json(new ApiResponse(200, { id }, 'Dish deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItemsBulk = async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(new ApiResponse(400, null, 'ids must be a non-empty array'));
    }
    const MAX_BULK_DELETE = 500;
    if (ids.length > MAX_BULK_DELETE) {
      return res.status(400).json(new ApiResponse(400, null, `Cannot delete more than ${MAX_BULK_DELETE} menu items at once`));
    }
    const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) {
      return res.status(400).json(new ApiResponse(400, null, 'No valid menu item ids provided'));
    }
    const result = await MenuItem.deleteMany({ _id: { $in: validIds } });
    return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, 'Menu items deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteAllMenuItems = async (req, res, next) => {
  try {
    const {
      search,
      category,
      cuisine,
      dietary,
      status,
      featured,
      popular,
      chefSpecial
    } = req.query;

    const filter = {};
    if (search) {
      const q = String(search);
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { cuisine: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') filter.category = category;
    if (cuisine && cuisine !== 'All') filter.cuisine = cuisine;
    if (dietary && dietary !== 'All') filter.dietary = dietary;
    if (status && status !== 'All') filter.status = status;
    if (featured !== undefined && featured !== '') filter.featured = String(featured) === 'true';
    if (popular !== undefined && popular !== '') filter.popular = String(popular) === 'true';
    if (chefSpecial !== undefined && chefSpecial !== '') filter.chefSpecial = String(chefSpecial) === 'true';

    const result = await MenuItem.deleteMany(filter);
    return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, 'All matching menu items deleted successfully'));
  } catch (error) {
    next(error);
  }
};
