import { Server } from 'socket.io';
import { setNotificationEmitter } from '../utils/notificationService.js';

let io = null;

export function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    const role = socket.handshake.query.role || 'Admin';

    socket.join(`${role.toLowerCase().replace(/\s+/g, '-')}-room`);

    if (role === 'Super Admin') {
      socket.join('super-admin-room');
    }

    socket.join('admin-room');

    socket.on('disconnect', () => {
    });
  });

  setNotificationEmitter((notification) => {
    const roles = notification.recipientRoles || ['Super Admin', 'Admin', 'Manager'];
    roles.forEach(role => {
      const room = `${role.toLowerCase().replace(/\s+/g, '-')}-room`;
      io.to(room).emit('notification:new', notification);
    });
    io.to('admin-room').emit('notification:new', notification);
  });

  return io;
}

export function getIO() {
  return io;
}
