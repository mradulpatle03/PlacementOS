const AuditLog = require("../models/AuditLog");
const AppError = require("../utils/AppError");

// GET /api/v1/admin/audit
const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      action,
      entity,
      entityId,
      from,
      to,
      search,
    } = req.query;

    const filter = {};

    // filters
    if (userId) filter.user = userId;
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (entityId) filter.entityId = entityId;

    // date range
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)
        filter.createdAt.$lte = new Date(
          new Date(to).setHours(23, 59, 59, 999),
        );
    }

    // text search — across email, path, entityTitle
    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: "i" } },
        { path: { $regex: search, $options: "i" } },
        { entityTitle: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "name email role")
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/audit/:id
const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    if (!log) return next(new AppError("Audit log not found", 404));

    return res.status(200).json({ success: true, data: { log } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/audit/stats
// Summary counts by action + entity — useful for the admin audit UI
const getAuditStats = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to)
        dateFilter.createdAt.$lte = new Date(
          new Date(to).setHours(23, 59, 59, 999),
        );
    }

    const [byAction, byEntity, recentActivity] = await Promise.all([
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$entity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // activity per day — last 7 days
      AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        byAction: byAction.reduce((a, i) => {
          a[i._id] = i.count;
          return a;
        }, {}),
        byEntity: byEntity.reduce((a, i) => {
          a[i._id] = i.count;
          return a;
        }, {}),
        recentActivity: recentActivity.map((d) => ({
          date: d._id,
          count: d.count,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs, getAuditLogById, getAuditStats };
