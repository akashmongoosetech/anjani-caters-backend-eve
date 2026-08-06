import { FAQ } from '../models/FAQ.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getFAQs = async (req, res, next) => {
  try {
    const list = await FAQ.find().sort({ order: 1 }).lean();
    return res.status(200).json(new ApiResponse(200, list, 'FAQs retrieved'));
  } catch (error) {
    next(error);
  }
};

export const createFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.create(req.body);
    return res.status(201).json(new ApiResponse(201, faq, 'FAQ created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await FAQ.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return next(new ApiError(404, 'FAQ not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'FAQ updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    await FAQ.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'FAQ deleted successfully'));
  } catch (error) {
    next(error);
  }
};
