import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';
import { sendPasswordResetOtp } from '../utils/emailService.js';
import { pick } from '../utils/pick.js';

function dbIsConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDb() {
  if (!dbIsConnected()) {
    return new ApiError(503, 'Database not connected. Please try again later.');
  }
  return null;
}

function authCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // matches default JWT_EXPIRES_IN=7d
    path: '/',
  };
}

export const register = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { name, email, mobile, password, profilePicture } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError(400, 'An account with this email address already exists.'));
    }

    const hashedPassword = await hashPassword(password);
    // Role/permissions can NEVER be supplied by the client on public registration.
    const userRole = ROLES.CUSTOMER;

    const newUser = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: userRole,
      profilePicture,
      verified: true,
      permissions: []
    });

    const token = generateToken({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });

    res.cookie('token', token, authCookieOptions());

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

    res.cookie('token', token, authCookieOptions());

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

    const body = pick(req.body, [
      'firstName',
      'lastName',
      'name',
      'email',
      'mobile',
      'profilePicture',
    ]);
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

export const forgotPassword = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { emailOrMobile } = req.body;
    if (!emailOrMobile) {
      return next(new ApiError(400, 'Email or mobile is required.'));
    }

    const user = await User.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
    });

    // Always respond generically to avoid leaking whether an account exists.
    if (!user) {
      return res.status(200).json(new ApiResponse(200, { sent: false }, 'If that account exists, a verification code has been sent.'));
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await hashPassword(code);
    await User.updateOne(
      { _id: user._id },
      { $set: { otpReset: { codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 } } }
    );

    sendPasswordResetOtp(user, code).catch((err) => {
      console.error('[Email] Password reset OTP send failed:', err.message);
    });

    return res.status(200).json(new ApiResponse(200, { sent: true }, 'If that account exists, a verification code has been sent.'));
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { emailOrMobile, otp, newPassword } = req.body;
    if (!emailOrMobile || !otp || !newPassword) {
      return next(new ApiError(400, 'Email/mobile, verification code, and new password are required.'));
    }
    if (newPassword.length < 8) {
      return next(new ApiError(400, 'Password must be at least 8 characters.'));
    }

    const user = await User.findOne({ $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }] });

    if (!user || !user.otpReset || !user.otpReset.codeHash || !user.otpReset.expiresAt) {
      return next(new ApiError(400, 'No password reset has been requested for this account.'));
    }

    if (new Date(user.otpReset.expiresAt) < new Date()) {
      await User.updateOne({ _id: user._id }, { $set: { otpReset: { codeHash: '', expiresAt: null, attempts: 0 } } });
      return next(new ApiError(400, 'This verification code has expired. Please request a new one.'));
    }

    if ((user.otpReset.attempts || 0) >= 5) {
      await User.updateOne({ _id: user._id }, { $set: { otpReset: { codeHash: '', expiresAt: null, attempts: 0 } } });
      return next(new ApiError(429, 'Too many incorrect attempts. Please request a new verification code.'));
    }

    const isCodeValid = await comparePassword(otp, user.otpReset.codeHash);
    if (!isCodeValid) {
      await User.updateOne({ _id: user._id }, { $inc: { 'otpReset.attempts': 1 } });
      return next(new ApiError(400, 'Invalid verification code. Please check and try again.'));
    }

    const newPasswordHash = await hashPassword(newPassword);
    await User.updateOne(
      { _id: user._id },
      { $set: { password: newPasswordHash, otpReset: { codeHash: '', expiresAt: null, attempts: 0 } } }
    );

    return res.status(200).json(new ApiResponse(200, null, 'Password reset successfully.'));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const dbErr = requireDb(); if (dbErr) return next(dbErr);

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(new ApiError(400, 'Current password and new password are required.'));
    }
    if (newPassword.length < 8) {
      return next(new ApiError(400, 'Password must be at least 8 characters.'));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ApiError(404, 'Authenticated user profile not found.'));
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return next(new ApiError(400, 'Current password is incorrect.'));
    }

    const newPasswordHash = await hashPassword(newPassword);
    await User.updateOne({ _id: req.user.id }, { $set: { password: newPasswordHash } });

    return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully.'));
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  const opts = authCookieOptions();
  res.clearCookie('token', { path: opts.path, sameSite: opts.sameSite, secure: opts.secure, httpOnly: true });
  return res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
};
