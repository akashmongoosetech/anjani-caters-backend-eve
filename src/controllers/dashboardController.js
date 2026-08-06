import { Booking } from '../models/Booking.js';
import { Contact } from '../models/Contact.js';
import { Order } from '../models/Order.js';
import { Newsletter } from '../models/Newsletter.js';
import { User } from '../models/User.js';
import { BlogPost } from '../models/BlogPost.js';
import { MenuItem } from '../models/MenuItem.js';
import { Package } from '../models/Package.js';
import { Gallery } from '../models/Gallery.js';
import { ApiResponse } from '../utils/apiResponse.js';

async function countDocs(Model, fallback = 0) {
  try {
    const count = await Model.countDocuments();
    return count || fallback;
  } catch {
    return fallback;
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalBlogs, totalMenuItems, totalPackages, totalUsers,
      totalSubscribers, totalImages, totalBookings, totalOrders, totalContacts,
    ] = await Promise.all([
      countDocs(BlogPost, 0),
      countDocs(MenuItem, 0),
      countDocs(Package, 0),
      countDocs(User, 0),
      countDocs(Newsletter, 0),
      countDocs(Gallery, 0),
      countDocs(Booking, 0),
      countDocs(Order, 0),
      countDocs(Contact, 0),
    ]);

    let pendingBookings = 0;
    let confirmedBookings = 0;
    let totalRevenue = 0;
    let bookingsByMonth = [];
    let contactsByMonth = [];
    let ordersByStatus = [];
    let revenueByMonth = [];

    try {
      pendingBookings = await Booking.countDocuments({ status: { $regex: /^new$/i } });
    } catch { pendingBookings = 0; }
    try {
      confirmedBookings = await Booking.countDocuments({ status: { $regex: /^confirmed$/i } });
    } catch { confirmedBookings = 0; }

    try {
      const revenueAgg = await Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]);
      if (revenueAgg.length > 0) totalRevenue = revenueAgg[0].total;
    } catch { totalRevenue = 0; }

    try {
      const currentYear = new Date().getFullYear();
      revenueByMonth = await Order.aggregate([
        { $match: { createdAt: { $gte: new Date(`${currentYear}-01-01`), $lt: new Date(`${currentYear + 1}-01-01`) } } },
        { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]);
      revenueByMonth = MONTHS.map((month, i) => {
        const entry = revenueByMonth.find(r => r._id === i + 1);
        return { month, revenue: entry ? entry.revenue : 0 };
      });
    } catch { revenueByMonth = MONTHS.map(m => ({ month: m, revenue: 0 })); }

    try {
      const currentYear = new Date().getFullYear();
      const bkAgg = await Booking.aggregate([
        { $match: { createdAt: { $gte: new Date(`${currentYear}-01-01`), $lt: new Date(`${currentYear + 1}-01-01`) } } },
        { $group: { _id: { $month: '$createdAt' }, bookings: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      bookingsByMonth = MONTHS.map((month, i) => {
        const entry = bkAgg.find(b => b._id === i + 1);
        return { name: month, bookings: entry ? entry.bookings : 0 };
      });
    } catch { bookingsByMonth = MONTHS.map(m => ({ name: m, bookings: 0 })); }

    try {
      const currentYear = new Date().getFullYear();
      const ctAgg = await Contact.aggregate([
        { $match: { createdAt: { $gte: new Date(`${currentYear}-01-01`), $lt: new Date(`${currentYear + 1}-01-01`) } } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      contactsByMonth = MONTHS.map((month, i) => {
        const entry = ctAgg.find(c => c._id === i + 1);
        return { name: month, inquiries: entry ? entry.count : 0 };
      });
    } catch { contactsByMonth = MONTHS.map(m => ({ name: m, inquiries: 0 })); }

    try {
      const osAgg = await Order.aggregate([
        { $group: { _id: '$status', value: { $sum: 1 } } },
      ]);
      const colorMap = {
        pending: '#F59E0B',
        confirmed: '#10B981',
        delivered: '#3B82F6',
        cancelled: '#EF4444',
        preparing: '#8B5CF6',
      };
      ordersByStatus = osAgg.map(o => ({
        name: o._id.charAt(0).toUpperCase() + o._id.slice(1),
        value: o.value,
        color: colorMap[o._id] || '#94A3B8',
      }));
    } catch { ordersByStatus = []; }

    const stats = {
      totalBlogs,
      totalMenuItems,
      totalPackages,
      totalUsers,
      totalSubscribers,
      totalImages,
      totalVideos: 0,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      totalOrders,
      totalContacts,
      totalRevenue,
      revenueByMonth,
      bookingsByMonth,
      contactsByMonth,
      ordersByStatus,
    };

    return res.status(200).json(new ApiResponse(200, stats, 'Dashboard statistics fetched successfully'));
  } catch (error) {
    next(error);
  }
};
