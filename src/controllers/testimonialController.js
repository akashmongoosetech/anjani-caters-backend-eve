import { Testimonial } from '../models/Testimonial.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getTestimonials = async (req, res, next) => {
  try {
    const list = await Testimonial.find().lean();
    return res.status(200).json(new ApiResponse(200, list, 'Testimonials retrieved'));
  } catch (error) {
    next(error);
  }
};

export const createTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    return res.status(201).json(new ApiResponse(201, testimonial, 'Testimonial created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Testimonial.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return next(new ApiError(404, 'Testimonial not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Testimonial updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Testimonial.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'Testimonial deleted successfully'));
  } catch (error) {
    next(error);
  }
};
