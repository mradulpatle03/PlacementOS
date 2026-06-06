let io = null;

/**
 * Initialise Socket.IO with the HTTP server.
 * Call this once from app.js.
 */
const initSocket = (httpServer, corsOrigin) => {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // ── Pipeline rooms — join/leave per drive ─────────────────
    socket.on('join:drive', (driveId) => {
      if (driveId) socket.join(`drive:${driveId}`);
    });

    socket.on('leave:drive', (driveId) => {
      if (driveId) socket.leave(`drive:${driveId}`);
    });

    // ── User personal room — join with userId for notifications ─
    // Client emits this right after connecting (see useNotificationSocket)
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[Socket] User ${userId} joined personal room`);
      }
    });

    socket.on('leave:user', (userId) => {
      if (userId) socket.leave(`user:${userId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

// ── Pipeline emitters ─────────────────────────────────────────

const emitStageMoved = (driveId, payload) => {
  if (!io) return;
  io.to(`drive:${driveId}`).emit('pipeline:stage_moved', payload);
};

const emitBulkMoved = (driveId, payload) => {
  if (!io) return;
  io.to(`drive:${driveId}`).emit('pipeline:bulk_moved', payload);
};

const emitApplicationRejected = (driveId, payload) => {
  if (!io) return;
  io.to(`drive:${driveId}`).emit('pipeline:rejected', payload);
};

// ── Notification emitter ──────────────────────────────────────

/**
 * Push a real-time in-app notification to a specific user.
 * Called from notificationWorker after saving to DB.
 *
 * @param {string} userId   - User._id as string
 * @param {object} payload  - { _id, type, title, message, metadata, createdAt }
 */
const emitNotification = (userId, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', payload);
};

// ── Utility ───────────────────────────────────────────────────

const getIO = () => io;

module.exports = {
  initSocket,
  emitStageMoved,
  emitBulkMoved,
  emitApplicationRejected,
  emitNotification,
  getIO,
};