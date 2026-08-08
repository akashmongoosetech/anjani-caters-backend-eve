import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ApiError(401, 'Unauthorized access. Authentication token missing.'));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return next(new ApiError(401, 'Token verification failed or token has expired.'));
  }

  if (!decoded || !decoded.id) {
    return next(new ApiError(401, 'Token verification failed or token has expired.'));
  }

  // Re-validate against the database so suspended, deleted, or demoted
  // accounts lose access immediately (their JWT is not trusted alone).
  try {
    if (mongoose.connection.readyState !== 1) {
      return next(new ApiError(503, 'Database not connected. Please try again later.'));
    }

    const user = await User.findOne({ _id: decoded.id, isDeleted: { $ne: true } }).select('-password').lean();

    if (!user) {
      return next(new ApiError(401, 'Account no longer exists. Please log in again.'));
    }

    if (user.status !== 'Active') {
      return next(new ApiError(403, `Your account is ${user.status || 'inactive'}. Please contact your administrator.`));
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    };
    next();
  } catch (error) {
    return next(new ApiError(401, 'Unable to verify account credentials. Please try again.'));
  }
};

export const authMiddleware = protect;
