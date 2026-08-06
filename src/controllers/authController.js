import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';

function dbIsConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDb() {
  if (!dbIsConnected()) {
    return new ApiError(503, 'Database not connected. Please try again later.');
  }
  return null;
}

export const register = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { name, email, mobile, password, role, profilePicture } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError(400, 'An account with this email address already exists.'));
    }

    const hashedPassword = await hashPassword(password);
    const userRole = role ? role.toLowerCase().replace(/\s+/g, '_') : ROLES.ADMIN;

    const newUser = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: userRole,
      profilePicture,
      verified: true,
      permissions: ['all']
    });

    const token = generateToken({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return res.status(201).json(new ApiResponse(201, {
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        role: newUser.role,
        profilePicture: newUser.profilePicture || '',
        permissions: newUser.permissions || []
      }
    }, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { emailOrMobile, password } = req.body;

    if (!emailOrMobile || !password) {
      return next(new ApiError(400, 'Please provide both email/mobile and password.'));
    }

    const user = await User.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }, { username: emailOrMobile }]
    });

    if (!user) {
      return next(new ApiError(401, 'Invalid login credentials. Please verify your email/mobile/username and password.'));
    }

    if (user.status !== 'Active') {
      return next(new ApiError(403, 'Your account is ' + (user.status || 'inactive') + '. Please contact your administrator.'));
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return next(new ApiError(401, 'Invalid credentials provided.'));
    }

    if (user._id) {
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(() => {});
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return res.status(200).json(new ApiResponse(200, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        username: user.username || '',
        role: user.role,
        status: user.status || 'Active',
        profilePicture: user.profilePicture || '',
        permissions: user.permissions || []
      }
    }, 'Authentication successful'));
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return next(new ApiError(404, 'Authenticated user profile not found.'));
    }

    return res.status(200).json(new ApiResponse(200, {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      username: user.username || '',
      role: user.role,
      status: user.status || 'Active',
      profilePicture: user.profilePicture || '',
      permissions: user.permissions || []
    }, 'User profile retrieved'));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const body = { ...req.body };
    if (body.email) body.email = body.email.trim().toLowerCase();
    if (body.firstName || body.lastName) {
      body.name = `${body.firstName || ''} ${body.lastName || ''}`.trim();
    }
    delete body.password;
    delete body.role;
    delete body.username;
    delete body.status;

    const updated = await User.findByIdAndUpdate(req.user.id, body, { new: true, runValidators: true }).select('-password').lean();

    if (!updated) {
      return next(new ApiError(404, 'User profile not found. Please login again.'));
    }

    return res.status(200).json(new ApiResponse(200, {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      mobile: updated.mobile,
      username: updated.username || '',
      role: updated.role,
      status: updated.status || 'Active',
      profilePicture: updated.profilePicture || '',
      permissions: updated.permissions || []
    }, 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const verifyAccount = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { emailOrMobile } = req.body;
    if (!emailOrMobile) {
      return next(new ApiError(400, 'Email or mobile is required.'));
    }

    const user = await User.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
    });

    if (!user) {
      return next(new ApiError(404, 'No account found with that email or mobile.'));
    }

    return res.status(200).json(new ApiResponse(200, {
      verified: true,
      email: user.email
    }, 'Account verified successfully.'));
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { emailOrMobile, newPassword } = req.body;
    if (!emailOrMobile || !newPassword) {
      return next(new ApiError(400, 'Email/mobile and new password are required.'));
    }
    if (newPassword.length < 8) {
      return next(new ApiError(400, 'Password must be at least 8 characters.'));
    }

    const user = await User.findOne({ $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }] });

    if (!user) {
      return next(new ApiError(404, 'Account not found.'));
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return res.status(200).json(new ApiResponse(200, null, 'Password reset successfully.'));
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token');
  return res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
};
