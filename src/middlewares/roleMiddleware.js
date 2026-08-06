import { ApiError } from '../utils/apiError.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    const normalizedRoles = roles.map(r => r.toLowerCase());
    if (!req.user || !normalizedRoles.includes(req.user.role.toLowerCase())) {
      return next(new ApiError(403, `Access denied. Role '${req.user?.role || 'Guest'}' is not authorized to access this resource.`));
    }
    next();
  };
};
