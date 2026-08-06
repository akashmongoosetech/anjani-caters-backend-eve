import { Order } from '../models/Order.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { createNotificationHelper } from '../utils/notificationService.js';

export const createOrder = async (req, res, next) => {
  try {
    const order = await Order.create(req.body);
    createNotificationHelper({
      title: 'New Order Placed',
      message: `Order ${order.orderNumber} placed by ${order.customerName} for ${order.totalAmount ? `$${order.totalAmount}` : ''}`,
      type: 'Order',
      icon: 'ShoppingCart',
      priority: 'Medium',
      recipientRoles: ['Super Admin', 'Admin', 'Manager'],
      relatedModule: 'Order',
      relatedRecordId: order._id.toString(),
      actionUrl: '/admin/orders',
      createdBy: 'System'
    }).catch(() => {});
    return res.status(201).json(new ApiResponse(201, order, 'Order created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const { search, status, paymentStatus, sortBy = 'latest', page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      const q = String(search);
      query.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { orderNumber: { $regex: q, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Order.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    return res.status(200).json(new ApiResponse(200, {
      orders: items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }, 'Orders retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) return next(new ApiError(404, 'Order not found'));
    return res.status(200).json(new ApiResponse(200, order, 'Order retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    const updated = await Order.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    if (!updated) return next(new ApiError(404, 'Order not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Order updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) return next(new ApiError(404, 'Order not found'));
    return res.status(200).json(new ApiResponse(200, { id }, 'Order deleted successfully'));
  } catch (error) {
    next(error);
  }
};
