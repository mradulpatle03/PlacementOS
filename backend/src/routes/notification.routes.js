const express = require('express');
const router  = express.Router();

const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
} = require('../controllers/notification.controller');

const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

// notifications
router.get('/',                   getNotifications);
router.get('/unread-count',       getUnreadCount);
router.patch('/mark-all-read',    markAllRead);
router.patch('/:id/read',         markRead);
router.delete('/:id',             deleteNotification);

// preferences
router.get('/preferences',        getPreferences);
router.patch('/preferences',      updatePreferences);

module.exports = router;