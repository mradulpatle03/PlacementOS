const Notification = require('../models/Notification');
const AppError     = require('../utils/AppError');

// GET /api/v1/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        unreadCount,
        page:  Number(page),
        pages: Math.ceil(total / Number(limit)),
        notifications,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead:    false,
    });
    return res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id:       req.params.id,
      recipient: req.user._id,
    });
    if (!notification) return next(new AppError('Notification not found', 404));

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({ success: true, data: { notification } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/mark-all-read
const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id:       req.params.id,
      recipient: req.user._id,
    });
    if (!notification) return next(new AppError('Notification not found', 404));
    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications/preferences
const getPreferences = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id)
      .select('notificationPreferences')
      .lean();

    return res.status(200).json({
      success: true,
      data: { preferences: user.notificationPreferences },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/preferences
const updatePreferences = async (req, res, next) => {
  try {
    const User  = require('../models/User');
    const { email = {}, inApp = {} } = req.body;

    const TYPES = [
      'drive_opened', 'application_status', 'oa_reminder',
      'interview_reminder', 'offer_released', 'result_declared', 'general',
    ];

    const setObj = {};
    TYPES.forEach((t) => {
      if (typeof email[t] === 'boolean')
        setObj[`notificationPreferences.email.${t}`] = email[t];
      if (typeof inApp[t] === 'boolean')
        setObj[`notificationPreferences.inApp.${t}`] = inApp[t];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setObj },
      { new: true, select: 'notificationPreferences' }
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Preferences updated',
      data: { preferences: user.notificationPreferences },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
};