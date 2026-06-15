const AuditLog = require("../models/AuditLog");

/**
 * log(payload)
 *
 * Records an audit event. Fail-open — never throws.
 *
 * @param {object} payload
 * @param {object} [payload.req]          - Express request (optional)
 * @param {string} payload.action         - CRUD action enum
 * @param {string} payload.entity         - entity type enum
 * @param {string} [payload.entityId]     - affected document _id
 * @param {string} [payload.entityTitle]  - human-readable label
 * @param {object} [payload.changes]      - { before, after }
 * @param {object} [payload.meta]         - extra context
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
      path: req?.path || null,
      statusCode: null, // set after response if needed
      changes: changes || null,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      userAgent: req?.headers?.["user-agent"]?.slice(0, 200) || null,
      meta: meta || null,
    });
  } catch (err) {
    // never crash the app because of audit logging
    console.log("[AuditLog] Write failed (non-fatal):", err.message);
  }
};

module.exports = { log };
