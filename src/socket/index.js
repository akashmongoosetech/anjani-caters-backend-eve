import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { setNotificationEmitter } from '../utils/notificationService.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

let io = null;

function toRoom(role) {
  return `${String(role || '').toLowerCase().replace(/_/g, ' ').replace(/\s+/g, '-')}-room`;
}

function extractToken(socket) {
  // Preferred: handshake auth (not logged in URLs). Fallback: legacy query token.
  const fromAuth = socket.handshake?.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth) return fromAuth;
  const fromQuery = socket.handshake?.query?.token;
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
  return null;
}

export function setupSocket(httpServer) {
  const raw = [process.env.CORS_ORIGIN, process.env.CLIENT_URL, process.env.SERVER_URL]
    .filter(Boolean)
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const allowedOrigins = raw.length > 0 ? raw : ['http://localhost:5173', 'http://localhost:3000'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  // Authenticate every socket from its JWT before it may join any room.
  // Rejects unauthenticated / suspended / deleted accounts, mirroring protect().
  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('Authentication required.'));
      }

      let decoded;
      try {
        decoded = verifyToken(token);
      } catch {
        return next(new Error('Invalid or expired token.'));
      }

      if (!decoded || !decoded.id) {
        return next(new Error('Invalid or expired token.'));
      }

      if (mongoose.connection.readyState !== 1) {
        return next(new Error('Database not connected. Please try again later.'));
      }

      const user = await User.findOne({ _id: decoded.id, isDeleted: { $ne: true } })
        .select('_id email role status')
        .lean();

      if (!user) {
        return next(new Error('Account no longer exists.'));
      }

      if (user.status !== 'Active') {
        return next(new Error('Account is not active.'));
      }

      socket.data.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      };
      return next();
    } catch {
      return next(new Error('Unable to verify socket credentials.'));
    }
  });

  io.on('connection', (socket) => {
    // Role comes from the verified JWT only — never from client-supplied query.
    const role = socket.data?.user?.role || 'guest';

    socket.join(toRoom(role));

    if (String(role).toLowerCase().replace(/_/g, ' ') === 'super admin' || String(role).toLowerCase() === 'super_admin') {
      socket.join('super-admin-room');
    }

    socket.on('disconnect', () => {
    });
  });

  setNotificationEmitter((notification) => {
    if (!io) return;
    const roles = notification.recipientRoles || ['Super Admin', 'Admin', 'Manager'];
    roles.forEach(role => {
      io.to(toRoom(role)).emit('notification:new', notification);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
