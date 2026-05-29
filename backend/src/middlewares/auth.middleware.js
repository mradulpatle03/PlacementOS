const { verifyAccessToken } = require("../utils/jwt");
const { createError } = require("./errorHandler");
const User = require("../models/User");
const { ROLE_PERMISSIONS } = require("../config/permissions");

// Attach user to req — requires valid Bearer token
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(createError("No token provided", 401));
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return next(createError("Unauthorized", 401));
    }

    const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
    req.user = user;
    req.permissions = [...new Set([...roleDefaults, ...user.permissions])];
    next();
  } catch (err) {
    return next(createError("Invalid or expired token", 401));
  }
};

// Role-based access: requireRole('tpo', 'admin')
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(createError("Unauthorized", 401));
    if (!roles.includes(req.user.role)) {
      return next(createError("Access denied: insufficient role", 403));
    }
    next();
  };

const requirePermission = (permission) => (req, res, next) => {
  if (!req.permissions || !req.permissions.includes(permission)) {
    return next(
      createError(`Access denied: missing permission [${permission}]`, 403),
    );
  }
  next();
};

module.exports = { requireAuth, requireRole, requirePermission };
