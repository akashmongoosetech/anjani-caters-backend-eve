import fs from 'fs';
import path from 'path';
import { Gallery } from '../models/Gallery.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getGalleryItems = async (req, res, next) => {
  try {
    const { search, type, category, status, featured, sortBy = 'latest', page = 1, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      const q = String(search);
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }

    if (type && type !== 'All') filter.type = type;
    if (category && category !== 'All') filter.category = category;
    if (status && status !== 'All') filter.status = status;
    if (featured !== undefined && featured !== '') {
      filter.featured = String(featured) === 'true';
    }

    let sort = {};
    if (sortBy === 'latest') sort = { createdAt: -1 };
    else if (sortBy === 'oldest') sort = { createdAt: 1 };
    else if (sortBy === 'title') sort = { title: 1 };
    else if (sortBy === 'displayOrder') sort = { displayOrder: 1 };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);

    const [items, total] = await Promise.all([
      Gallery.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Gallery.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json(new ApiResponse(200, {
      gallery: items,
      total,
      page: pageNum,
      totalPages
    }, 'Gallery items retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getGalleryItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Gallery.findById(id).lean();
    if (!item) {
      return next(new ApiError(404, 'Gallery item not found'));
    }
    return res.status(200).json(new ApiResponse(200, item, 'Gallery item retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createGalleryItem = async (req, res, next) => {
  try {
    const body = req.body;
    const item = await Gallery.create({
      type: body.type || 'image',
      title: body.title,
      description: body.description || '',
      category: body.category || 'Weddings',
      imageUrl: body.imageUrl || body.image || '',
      videoUrl: body.videoUrl || '',
      videoType: body.videoType || 'youtube',
      thumbnail: body.thumbnail || body.imageUrl || '',
      featured: Boolean(body.featured),
      displayOrder: Number(body.displayOrder) || 0,
      status: body.status || 'Active',
    });

    return res.status(201).json(new ApiResponse(201, item, 'Gallery item added successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const allowedFields = [
      'type', 'title', 'description', 'category', 'imageUrl', 'videoUrl',
      'videoType', 'thumbnail', 'featured', 'displayOrder', 'status'
    ];
    const update = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const updated = await Gallery.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!updated) {
      return next(new ApiError(404, 'Gallery item not found'));
    }

    return res.status(200).json(new ApiResponse(200, updated, 'Gallery item updated successfully'));
  } catch (error) {
    next(error);
  }
};

function tryDeleteFile(url) {
  if (!url || typeof url !== 'string') return;
  if (url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const deleteGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Gallery.findByIdAndDelete(id).lean();
    if (!deleted) {
      return next(new ApiError(404, 'Gallery item not found'));
    }

    tryDeleteFile(deleted.imageUrl);
    tryDeleteFile(deleted.thumbnail);

    return res.status(200).json(new ApiResponse(200, { id }, 'Gallery item deleted successfully'));
  } catch (error) {
    next(error);
  }
};
