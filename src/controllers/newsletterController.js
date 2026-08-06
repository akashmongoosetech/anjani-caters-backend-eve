import { Newsletter } from '../models/Newsletter.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { sendNewsletterConfirmation } from '../utils/emailService.js';
import { createNotificationHelper } from '../utils/notificationService.js';

export const getSubscribers = async (req, res, next) => {
  try {
    const { search, status, source, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      filter.email = { $regex: String(search), $options: 'i' };
    }
    if (status && status !== 'All') filter.status = status;
    if (source && source !== 'All') filter.source = source;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);

    const [items, total] = await Promise.all([
      Newsletter.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Newsletter.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json(new ApiResponse(200, {
      subscribers: items,
      total,
      page: pageNum,
      totalPages
    }, 'Newsletter subscribers retrieved'));
  } catch (error) {
    next(error);
  }
};

export const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email, source } = req.body;
    if (!email) {
      return res.status(400).json(new ApiResponse(400, null, 'Email is required'));
    }

    const subscriber = await Newsletter.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        email: email.toLowerCase(),
        source: source || 'Website Footer',
        status: 'Active',
        subscribedAt: new Date(),
      },
      { upsert: true, new: true }
    ).lean();

    // Trigger thank-you email asynchronously (never blocks the subscribe response)
    sendNewsletterConfirmation(subscriber.email)
      .then((result) => {
        if (result && result.success === false) console.error('[Newsletter email] Confirmation email failed:', result.error);
      })
      .catch((err) => console.error('[Newsletter email] Confirmation email error:', err.message));

    // Trigger admin notification asynchronously
    createNotificationHelper({
      title: '✉️ New Newsletter Subscriber',
      message: `New subscriber joined: ${subscriber.email} (${subscriber.source || 'Website'}).`,
      type: 'Newsletter',
      icon: 'Send',
      priority: 'Low',
      relatedModule: 'Newsletter',
      relatedRecordId: subscriber._id,
      actionUrl: '/admin/newsletter',
      createdBy: 'Newsletter Form'
    }).catch(err => console.error('Newsletter notification creation error:', err));

    return res.status(201).json(new ApiResponse(201, subscriber, 'Subscribed successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateSubscriberStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Newsletter.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!updated) {
      return next(new ApiError(404, 'Subscriber not found'));
    }

    return res.status(200).json(new ApiResponse(200, updated, 'Subscriber status updated'));
  } catch (error) {
    next(error);
  }
};

export const deleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Newsletter.findByIdAndDelete(id).lean();
    if (!deleted) {
      return next(new ApiError(404, 'Subscriber not found'));
    }

    return res.status(200).json(new ApiResponse(200, { id }, 'Subscriber deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteSubscribers = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json(new ApiResponse(400, null, 'ids array is required'));
    }

    const result = await Newsletter.deleteMany({ _id: { $in: ids } });

    return res.status(200).json(new ApiResponse(200, { deletedCount: result.deletedCount }, 'Subscribers deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const exportSubscribersCSV = async (req, res, next) => {
  try {
    const items = await Newsletter.find().sort({ createdAt: -1 }).lean();
    let csv = 'Email,Subscription Date,Status,Source\n';
    items.forEach(s => {
      csv += `"${s.email}","${s.subscribedAt || s.createdAt}","${s.status}","${s.source}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=newsletter_subscribers.csv');
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
