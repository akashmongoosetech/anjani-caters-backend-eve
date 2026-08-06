import { User } from '../models/User.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { hashPassword } from '../utils/password.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import { createNotificationHelper } from '../utils/notificationService.js';

export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status, sortBy = 'latest', page = 1, limit = 10 } = req.query;

    const query = { isDeleted: { $ne: true } };
    if (search) {
      const q = String(search);
      query.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
      ];
    }
    if (role && role !== 'All') query.role = role.toLowerCase();
    if (status && status !== 'All') query.status = status;

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
    else if (sortBy === 'name') sortOptions = { name: 1 };

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      User.find(query).select('-password').sort(sortOptions).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json(new ApiResponse(200, {
      users: items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }, 'Users retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, isDeleted: { $ne: true } }).select('-password').lean();
    if (!user) return next(new ApiError(404, 'User not found'));
    return res.status(200).json(new ApiResponse(200, user, 'User retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const body = req.body;
    const email = (body.email || '').trim().toLowerCase();
    const username = (body.username || '').trim();
    const mobile = (body.mobile || '').trim();

    if (!email) return next(new ApiError(400, 'Email is required'));
    if (!body.password || body.password.length < 8) {
      return next(new ApiError(400, 'Password is required and must be at least 8 characters'));
    }

    const existingEmail = await User.findOne({ email, isDeleted: { $ne: true } }).lean();
    if (existingEmail) return next(new ApiError(400, 'A user with this email already exists'));

    if (username) {
      const existingUsername = await User.findOne({ username, isDeleted: { $ne: true } }).lean();
      if (existingUsername) return next(new ApiError(400, 'This username is already taken'));
    }

    if (mobile) {
      const existingMobile = await User.findOne({ mobile, isDeleted: { $ne: true } }).lean();
      if (existingMobile) return next(new ApiError(400, 'A user with this mobile number already exists'));
    }

    const firstName = body.firstName || '';
    const lastName = body.lastName || '';
    const name = body.name || `${firstName} ${lastName}`.trim() || email.split('@')[0];

    const hashedPassword = await hashPassword(body.password);

    const userData = {
      firstName,
      lastName,
      name,
      email,
      mobile,
      username: username || undefined,
      password: hashedPassword,
      role: (body.role || 'admin').toLowerCase(),
      profilePicture: body.profilePicture || body.avatar || '',
      status: body.status || 'Active',
      createdBy: req.user?.id || null,
    };

    const user = await User.create(userData);
    const { password, ...safeUser } = user.toObject();

    sendWelcomeEmail({ name, email, username, role: userData.role }, body.password)
      .then((result) => {
        if (result && result.success === false) console.error('[User email] Welcome email failed:', result.error);
      })
      .catch((err) => console.error('[User email] Welcome email error:', err.message));

    createNotificationHelper({
      title: 'New User Created',
      message: `User "${name}" (${email}) has been created with role "${userData.role}"`,
      type: 'System',
      icon: 'Users',
      priority: 'Medium',
      recipientRoles: ['super_admin', 'admin'],
      relatedModule: 'User',
      relatedRecordId: user._id.toString(),
      actionUrl: `/admin/users/view/${user._id}`,
      createdBy: req.user?.email || 'System'
    });

    return res.status(201).json(new ApiResponse(201, safeUser, 'User created successfully'));
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new ApiError(400, `Duplicate ${field}. This ${field} is already registered.`));
    }
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    if (body.email) body.email = body.email.trim().toLowerCase();
    if (body.firstName || body.lastName) {
      body.name = `${body.firstName || ''} ${body.lastName || ''}`.trim();
    }
    if (body.role) body.role = body.role.toLowerCase();
    body.updatedBy = req.user?.id || null;

    delete body.password;

    if (body.username) {
      const existing = await User.findOne({ username: body.username, _id: { $ne: id }, isDeleted: { $ne: true } }).lean();
      if (existing) return next(new ApiError(400, 'This username is already taken by another user'));
    }
    if (body.email) {
      const existing = await User.findOne({ email: body.email, _id: { $ne: id }, isDeleted: { $ne: true } }).lean();
      if (existing) return next(new ApiError(400, 'This email is already registered by another user'));
    }
    if (body.mobile) {
      const existing = await User.findOne({ mobile: body.mobile, _id: { $ne: id }, isDeleted: { $ne: true } }).lean();
      if (existing) return next(new ApiError(400, 'This mobile number is already registered by another user'));
    }

    let updated;
    try {
      updated = await User.findByIdAndUpdate(id, body, { new: true, runValidators: true }).select('-password').lean();
    } catch {
      return next(new ApiError(400, 'Invalid user ID format'));
    }
    if (!updated) return next(new ApiError(404, 'User not found'));

    createNotificationHelper({
      title: 'User Updated',
      message: `User "${updated.name}" (${updated.email}) details were updated`,
      type: 'System',
      icon: 'Users',
      priority: 'Low',
      recipientRoles: ['super_admin', 'admin'],
      relatedModule: 'User',
      relatedRecordId: id,
      actionUrl: `/admin/users/view/${id}`,
      createdBy: req.user?.email || 'System'
    });

    return res.status(200).json(new ApiResponse(200, updated, 'User updated successfully'));
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new ApiError(400, `Duplicate ${field}. This ${field} is already taken.`));
    }
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return next(new ApiError(400, 'You cannot delete your own account'));
    }

    const user = await User.findById(id).lean();
    if (!user || user.isDeleted) return next(new ApiError(404, 'User not found'));

    if (user.role === 'super_admin') {
      const superAdminCount = await User.countDocuments({ role: 'super_admin', isDeleted: { $ne: true } });
      if (superAdminCount <= 1) {
        return next(new ApiError(400, 'Cannot delete the last remaining Super Admin account'));
      }
    }

    await User.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), updatedBy: req.user?.id || null });

    createNotificationHelper({
      title: 'User Deleted',
      message: `User "${user.name}" (${user.email}) was deleted by ${req.user?.email || 'Administrator'}`,
      type: 'Warning',
      icon: 'Users',
      priority: 'Medium',
      recipientRoles: ['super_admin', 'admin'],
      relatedModule: 'User',
      relatedRecordId: id,
      actionUrl: '/admin/users',
      createdBy: req.user?.email || 'System'
    });

    return res.status(200).json(new ApiResponse(200, { id }, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const password = newPassword || 'Reset@1234';

    if (password.length < 8) {
      return next(new ApiError(400, 'Password must be at least 8 characters'));
    }

    const hashedPwd = await hashPassword(password);
    const updated = await User.findByIdAndUpdate(id, { password: hashedPwd, updatedBy: req.user?.id || null }, { runValidators: true });
    if (!updated) return next(new ApiError(404, 'User not found'));

    sendPasswordResetEmail({ name: updated.name, email: updated.email }, password)
      .then((result) => {
        if (result && result.success === false) console.error('[User email] Password reset email failed:', result.error);
      })
      .catch((err) => console.error('[User email] Password reset email error:', err.message));

    createNotificationHelper({
      title: 'Password Reset',
      message: `Password reset for user "${updated.name}" (${updated.email}) by ${req.user?.email || 'Administrator'}`,
      type: 'Warning',
      icon: 'Key',
      priority: 'High',
      recipientRoles: ['super_admin', 'admin'],
      relatedModule: 'User',
      relatedRecordId: id,
      actionUrl: `/admin/users/view/${id}`,
      createdBy: req.user?.email || 'System'
    });

    return res.status(200).json(new ApiResponse(200, { id }, 'Password reset successfully. New credentials sent via email.'));
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
      return next(new ApiError(400, 'Status must be one of: Active, Inactive, Suspended'));
    }

    if (req.user?.id === id) {
      return next(new ApiError(400, 'You cannot change your own account status'));
    }

    if (status !== 'Active') {
      const user = await User.findById(id).lean();
      if (user?.role === 'super_admin') {
        const superAdminCount = await User.countDocuments({ role: 'super_admin', isDeleted: { $ne: true } });
        if (superAdminCount <= 1) {
          return next(new ApiError(400, 'Cannot deactivate the last remaining Super Admin account'));
        }
      }
    }

    const updated = await User.findByIdAndUpdate(id, { status, updatedBy: req.user?.id || null }, { runValidators: true }).select('-password').lean();
    if (!updated) return next(new ApiError(404, 'User not found'));

    createNotificationHelper({
      title: 'User Status Changed',
      message: `User "${updated.name}" (${updated.email}) status changed to "${status}"`,
      type: 'System',
      icon: 'Users',
      priority: 'Medium',
      recipientRoles: ['super_admin', 'admin'],
      relatedModule: 'User',
      relatedRecordId: id,
      actionUrl: `/admin/users/view/${id}`,
      createdBy: req.user?.email || 'System'
    });

    return res.status(200).json(new ApiResponse(200, { id, status }, 'User status updated'));
  } catch (error) {
    next(error);
  }
};
