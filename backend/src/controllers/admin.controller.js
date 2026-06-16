const User = require("../models/User");
const Announcement = require("../models/Announcement");
const AppError = require("../utils/AppError");
const { notifyGeneral } = require("../queues/notificationQueue");

const VALID_ROLES = ["student", "recruiter", "coordinator", "tpo", "admin"];

// GET /api/v1/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshTokens -emailVerifyOTP -passwordResetOTP")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    // role counts
    const roleCounts = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const byRole = roleCounts.reduce((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        users,
        byRole,
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

// GET /api/v1/admin/users/:id
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -refreshTokens -emailVerifyOTP -passwordResetOTP")
      .lean();

    if (!user) return next(new AppError("User not found", 404));

    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return next(
        new AppError(`Invalid role. Valid: ${VALID_ROLES.join(", ")}`, 400),
      );
    }

    // prevent admin demoting themselves
    if (req.params.id === req.user._id.toString() && role !== "admin") {
      return next(new AppError("You cannot change your own role", 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true, select: "-password -refreshTokens" },
    ).lean();

    if (!user) return next(new AppError("User not found", 404));

    return res.status(200).json({
      success: true,
      message: `Role updated to ${role}`,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/users/:id/toggle
const toggleUserActive = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return next(new AppError("You cannot deactivate your own account", 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found", 404));

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"}`,
      data: { isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/admin/announcements
const broadcastAnnouncement = async (req, res, next) => {
  try {
    const { title, message, targetRoles, expiresAt } = req.body;

    if (!title || !message) {
      return next(new AppError("title and message are required", 400));
    }

    const announcement = await Announcement.create({
      title,
      message,
      targetRoles: targetRoles || [
        "student",
        "recruiter",
        "coordinator",
        "tpo",
      ],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id,
    });

    // send in-app notifications to all matching users (batched)
    const roles = announcement.targetRoles;
    const users = await User.find({
      role: { $in: roles },
      isActive: true,
    })
      .select("_id email")
      .lean();

    // fire-and-forget — don't await to avoid timeout on large user bases
    Promise.all(
      users.map((u) =>
        notifyGeneral(u._id.toString(), {
          title,
          message,
          recipientEmail: u.email,
          link: "/notifications",
        }).catch(() => {}),
      ),
    );

    return res.status(201).json({
      success: true,
      message: `Announcement sent to ${users.length} user(s)`,
      data: { announcement, recipientCount: users.length },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/announcements
const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      data: { announcements },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/announcements/active  — used by frontend banner
const getActiveAnnouncements = async (req, res, next) => {
  try {
    const { role } = req.query;

    const filter = {
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };

    if (role) filter.targetRoles = role;

    const announcements = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      data: { announcements },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  toggleUserActive,
  broadcastAnnouncement,
  getAnnouncements,
  getActiveAnnouncements,
};
