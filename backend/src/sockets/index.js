let io = null;

/**
 * Initialise Socket.IO with the HTTP server.
 * Call this once from app.js/server entry point.
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
    // client joins a room per drive — only that drive's pipeline gets updates
    socket.on('join:drive', (driveId) => {
      if (driveId) {
        socket.join(`drive:${driveId}`);
      }
    });

    socket.on('leave:drive', (driveId) => {
      if (driveId) {
        socket.leave(`drive:${driveId}`);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

/**
 * Emit a pipeline stage-move event to all clients watching a drive.
 * Called from pipeline.controller after a successful move.
 *
 * @param {string} driveId
 * @param {object} payload  { applicationId, previousStage, currentStage, movedBy, note }
 */
const emitStageMoved = (driveId, payload) => {
  if (!io) return;
  io.to(`drive:${driveId}`).emit('pipeline:stage_moved', payload);
};

/**
 * Emit a bulk-move event to all clients watching a drive.
 *
 * @param {string} driveId
 * @param {object} payload  { moved: [...], targetStage, movedBy }
 */
const emitBulkMoved = (driveId, payload) => {
  if (!io) return;
  io.to(`drive:${driveId}`).emit('pipeline:bulk_moved', payload);
};

/**
 * Emit a rejection event to all clients watching a drive.
 *
 * @param {string} driveId
 * @param {object} payload  { applicationId, studentName, rejectedFromStage, reason }
 */
const emitApplicationRejected = (driveId, payload) => {
  if (!io) return;
  io.to(`drive:${driveId}`).emit('pipeline:rejected', payload);
};

/**
 * Get the raw io instance (useful for ad-hoc emits elsewhere).
 */
const getIO = () => io;

module.exports = {
  initSocket,
  emitStageMoved,
  emitBulkMoved,
  emitApplicationRejected,
  getIO,
};