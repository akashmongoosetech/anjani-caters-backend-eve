import mongoose from 'mongoose';
import { ServiceFAQ } from '../models/ServiceFAQ.js';
import { Service } from '../models/Service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { pick } from '../utils/pick.js';

const SERVICE_FAQ_FIELDS = ['question', 'answer', 'displayOrder', 'status'];

const normalize = (value) => {
  if (value === '' || value === undefined || value === null) return null;
  return String(value);
};

const getService = async (serviceId) => {
  if (!mongoose.isValidObjectId(serviceId)) return null;
  return Service.findById(serviceId).lean();
};

export const getServiceFAQs = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const service = await getService(serviceId);
    if (!service) return next(new ApiError(404, 'Service not found'));

    const query = { serviceId };
    const status = normalize(req.query.status);
    if (status) {
      if (status !== 'All') query.status = status;
    } else {
      query.status = 'Active';
    }

    // Inactive services must not expose their FAQs publicly
    if (!service.active && query.status === 'Active') {
      return res.status(200).json(new ApiResponse(200, { serviceFAQs: [], total: 0 }, 'Service FAQs retrieved successfully'));
    }

    const serviceFAQs = await ServiceFAQ.find(query)
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json(new ApiResponse(200, { serviceFAQs, total: serviceFAQs.length }, 'Service FAQs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createServiceFAQ = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const service = await getService(serviceId);
    if (!service) return next(new ApiError(404, 'Service not found'));

    const body = pick(req.body, SERVICE_FAQ_FIELDS);
    if (!body.question || !body.question.trim()) {
      return next(new ApiError(400, 'Question is required'));
    }
    if (!body.answer || !body.answer.trim()) {
      return next(new ApiError(400, 'Answer is required'));
    }
    if (body.displayOrder === undefined || body.displayOrder === null || body.displayOrder === '') {
      body.displayOrder = 0;
    }

    const serviceFAQ = await ServiceFAQ.create({ ...body, serviceId });
    return res.status(201).json(new ApiResponse(201, serviceFAQ, 'Service FAQ created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateServiceFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = pick(req.body, SERVICE_FAQ_FIELDS);
    if (body.question !== undefined && (!body.question || !body.question.trim())) {
      return next(new ApiError(400, 'Question is required'));
    }
    if (body.answer !== undefined && (!body.answer || !body.answer.trim())) {
      return next(new ApiError(400, 'Answer is required'));
    }
    if (body.displayOrder === '' || body.displayOrder === null || body.displayOrder === undefined) {
      delete body.displayOrder;
    }

    const updated = await ServiceFAQ.findByIdAndUpdate(id, body, { new: true });
    if (!updated) return next(new ApiError(404, 'Service FAQ not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Service FAQ updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateServiceFAQStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['Active', 'Inactive'].includes(status)) {
      return next(new ApiError(400, 'Invalid status. Use Active or Inactive.'));
    }
    const updated = await ServiceFAQ.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return next(new ApiError(404, 'Service FAQ not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Service FAQ status updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteServiceFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ServiceFAQ.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'Service FAQ deleted successfully'));
  } catch (error) {
    next(error);
  }
};
