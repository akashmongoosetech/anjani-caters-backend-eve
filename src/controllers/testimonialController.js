import { Testimonial } from '../models/Testimonial.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { pick } from '../utils/pick.js';
import { sendAdminNotification, sendMail } from '../utils/emailService.js';
import { createNotificationHelper } from '../utils/notificationService.js';

const TESTIMONIAL_FIELDS = ['name', 'role', 'company', 'rating', 'comment', 'avatar', 'eventType'];

export const getTestimonials = async (req, res, next) => {
  try {
    const list = await Testimonial.find({ status: 'Approved' }).sort({ createdAt: -1 }).lean();
    return res.status(200).json(new ApiResponse(200, list, 'Testimonials retrieved'));
  } catch (error) {
    next(error);
  }
};

export const getAllTestimonials = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status && ['Pending', 'Approved', 'Rejected'].includes(status.trim()) ? { status: status.trim() } : {};
    const list = await Testimonial.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(new ApiResponse(200, list, 'Testimonials retrieved'));
  } catch (error) {
    next(error);
  }
};

export const getTestimonialById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id).lean();
    if (!testimonial) return next(new ApiError(404, 'Testimonial not found'));
    return res.status(200).json(new ApiResponse(200, testimonial, 'Testimonial retrieved'));
  } catch (error) {
    next(error);
  }
};

export const submitTestimonial = async (req, res, next) => {
  try {
    const rating = Math.min(5, Math.max(1, parseInt(req.body.rating) || 5));
    const testimonial = await Testimonial.create({
      name: (req.body.name || '').trim(),
      email: (req.body.email || '').trim(),
      city: (req.body.city || '').trim(),
      eventType: (req.body.eventType || '').trim(),
      comment: (req.body.comment || '').trim(),
      avatar: (req.body.avatar || '').trim(),
      rating,
      status: 'Pending'
    });

    if (testimonial.email) {
      sendMail({
        to: testimonial.email,
        subject: 'Thank you for your review — Anjani Catering & Events',
        html: `<p>Dear ${testimonial.name},</p><p>Thank you for sharing your feedback with us. Your review is now pending moderation and will appear on our testimonials page once approved.</p><p>Warm regards,<br/>Anjani Catering &amp; Events Team</p>`
      }).catch((err) => {
        console.error('[Testimonial] Guest ack email failed:', err.message);
      });
    }

    sendAdminNotification('New Testimonial Review', {
      Name: testimonial.name,
      Email: testimonial.email || '-',
      City: testimonial.city || '-',
      'Event Type': testimonial.eventType || '-',
      Rating: `${testimonial.rating}/5`,
      Review: testimonial.comment
    }).catch((err) => {
      console.error('[Testimonial] Admin email notification failed:', err.message);
    });

    createNotificationHelper({
      title: 'New Testimonial Review',
      message: `${testimonial.name} submitted a ${testimonial.rating}-star review awaiting moderation`,
      type: 'Testimonial',
      icon: 'MessageSquare',
      priority: 'Medium',
      recipientRoles: ['Super Admin', 'Admin', 'Manager'],
      relatedModule: 'Testimonial',
      relatedRecordId: testimonial._id.toString(),
      actionUrl: '/admin/testimonials',
      createdBy: 'System'
    }).catch(() => {});

    return res.status(201).json(new ApiResponse(201, { id: testimonial._id }, 'Review submitted successfully. It will appear once approved by our team.'));
  } catch (error) {
    next(error);
  }
};

export const createTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.create({ ...pick(req.body, TESTIMONIAL_FIELDS), status: 'Approved' });
    return res.status(201).json(new ApiResponse(201, testimonial, 'Testimonial created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = pick(req.body, [...TESTIMONIAL_FIELDS, 'status']);
    const updated = await Testimonial.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return next(new ApiError(404, 'Testimonial not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Testimonial updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateTestimonialStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Testimonial.findByIdAndUpdate(id, { status: status.trim() }, { new: true, runValidators: true });
    if (!updated) return next(new ApiError(404, 'Testimonial not found'));
    return res.status(200).json(new ApiResponse(200, updated, `Testimonial ${status.toLowerCase()} successfully`));
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
