const AuditLog = require("../models/AuditLog");

/**
 * log(payload)
 *
 * Records an audit event. Fail-open — never throws.
 * Called directly from controllers or the auditMiddleware.
 *
 * @param {object} payload
 * @param {object} [payload.req]          - Express request (optional)
 * @param {string} payload.action         - CRUD action enum
 * @param {string} payload.entity         - entity type enum
 * @param {string} [payload.entityId]
 * @param {string} [payload.entityTitle]
 * @param {object} [payload.changes]      - { before, after }
 * @param {object} [payload.meta]
 */
const log = async ({
  req = null,
  user = null,
  action,
  entity,
  entityId = null,
  entityTitle = null,
  changes = null,
  meta = null,
}) => {
  try {
    const actingUser = user || req?.user || null;

    await AuditLog.create({
      user: actingUser?._id || null,
      userEmail: actingUser?.email || null,
      userRole: actingUser?.role || null,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      entityTitle: entityTitle || null,
      method: req?.method || null,
      path: req?.originalUrl || req?.path || null,
      statusCode: null,
      changes: changes || null,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      userAgent: req?.headers?.["user-agent"]?.slice(0, 200) || null,
      meta: meta || null,
    });
  } catch (err) {
    // Never crash the app — but always show full error for diagnosis
    console.error("[AuditLog] Write failed:", err.message);
    if (err.errors) {
      Object.keys(err.errors).forEach((field) => {
        console.error(
          `  [AuditLog] Validation '${field}':`,
          err.errors[field].message,
        );
      });
    }
  }
};

module.exports = { log };
