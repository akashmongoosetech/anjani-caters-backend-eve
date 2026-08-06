import { Contact } from '../models/Contact.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { sendContactAckEmail, sendAdminNotification } from '../utils/emailService.js';
import { createNotificationHelper } from '../utils/notificationService.js';

function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `ANJ-${code}`;
}

export const submitContact = async (req, res, next) => {
  try {
    const contact = await Contact.create({ ...req.body, reference: generateReference() });

    sendContactAckEmail(contact).catch((err) => {
      console.error('[Contact] Customer thank-you email failed:', err.message);
    });

    sendAdminNotification('Contact Form', {
      Reference: contact.reference,
      Name: contact.name,
      Email: contact.email,
      Phone: contact.phone || '-',
      'Event Date': contact.eventDate || '-',
      'Guest Count': contact.guestCount || '-',
      Message: contact.message
    }).catch((err) => {
      console.error('[Contact] Admin email notification failed:', err.message);
    });

    createNotificationHelper({
      title: 'New Contact Inquiry',
      message: `${contact.name} sent an inquiry${contact.eventType ? ` about ${contact.eventType}` : ''} (Ref ${contact.reference})`,
      type: 'Contact',
      icon: 'MessageSquare',
      priority: 'Medium',
      recipientRoles: ['Super Admin', 'Admin', 'Manager'],
      relatedModule: 'Contact',
      relatedRecordId: contact._id.toString(),
      actionUrl: '/admin/contacts',
      createdBy: 'System'
    }).catch(() => {});
    return res.status(201).json(new ApiResponse(201, contact, 'Contact submitted successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAllContacts = async (req, res, next) => {
  try {
    const { search, status, sortBy = 'latest', page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      const q = String(search);
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { message: { $regex: q, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Contact.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Contact.countDocuments(query),
    ]);

    return res.status(200).json(new ApiResponse(200, {
      contacts: items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }, 'Contacts retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getContactById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id).lean();
    if (!contact) return next(new ApiError(404, 'Contact not found'));
    return res.status(200).json(new ApiResponse(200, contact, 'Contact retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateContactStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    const updated = await Contact.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    if (!updated) return next(new ApiError(404, 'Contact not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Contact updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Contact.findByIdAndDelete(id);
    if (!deleted) return next(new ApiError(404, 'Contact not found'));
    return res.status(200).json(new ApiResponse(200, { id }, 'Contact deleted successfully'));
  } catch (error) {
    next(error);
  }
};
