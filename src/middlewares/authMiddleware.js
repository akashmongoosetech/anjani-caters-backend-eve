import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

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

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return next(new ApiError(401, 'Token verification failed or token has expired.'));
  }
};

export const authMiddleware = protect;
