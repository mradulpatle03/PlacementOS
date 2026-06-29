const { log } = require("../utils/auditLogger");

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE MAP  (matched against req.originalUrl — full path including /api/v1/)
// More-specific patterns MUST come before broader ones — first match wins.
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_MAP = [
  // ── AUTH ─────────────────────────────────────────────────────────────────
  {
    pattern: /\/auth\/register$/,
    method: "POST",
    action: "CREATE",
    entity: "Auth",
  },
  {
    pattern: /\/auth\/login$/,
    method: "POST",
    action: "LOGIN",
    entity: "Auth",
  },
  {
    pattern: /\/auth\/logout$/,
    method: "POST",
    action: "LOGOUT",
    entity: "Auth",
  },
  {
    pattern: /\/auth\/reset-password$/,
    method: "POST",
    action: "UPDATE",
    entity: "Auth",
  },
  {
    pattern: /\/auth\/forgot-password$/,
    method: "POST",
    action: "UPDATE",
    entity: "Auth",
  },

  // ── STUDENTS ─────────────────────────────────────────────────────────────
  {
    pattern: /\/students\/me\/projects\/[^/]+$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Student",
  },
  {
    pattern: /\/students\/me\/projects\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Student",
  },
  {
    pattern: /\/students\/me\/projects$/,
    method: "POST",
    action: "CREATE",
    entity: "Student",
  },
  {
    pattern: /\/students\/me\/skills$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Student",
  },
  {
    pattern: /\/students\/me$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Student",
  },

  // ── RECRUITERS ───────────────────────────────────────────────────────────
  {
    pattern: /\/recruiters\/me$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Recruiter",
  },
  {
    pattern: /\/recruiters\/[^/]+\/verify$/,
    method: "PUT",
    action: "VERIFY",
    entity: "Recruiter",
  },

  // ── RESUMES ──────────────────────────────────────────────────────────────
  {
    pattern: /\/resumes\/upload$/,
    method: "POST",
    action: "UPLOAD",
    entity: "Resume",
  },
  {
    pattern: /\/resumes\/[^/]+\/primary$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Resume",
  },
  {
    pattern: /\/resumes\/[^/]+\/label$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Resume",
  },
  {
    pattern: /\/resumes\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Resume",
  },

  // ── COMPANIES ────────────────────────────────────────────────────────────
  {
    pattern: /\/companies\/[^/]+\/logo$/,
    method: "POST",
    action: "UPLOAD",
    entity: "Company",
  },
  {
    pattern: /\/companies\/[^/]+\/recruiters\/[^/]+$/,
    method: "DELETE",
    action: "UPDATE",
    entity: "Company",
  },
  {
    pattern: /\/companies\/[^/]+\/recruiters$/,
    method: "POST",
    action: "UPDATE",
    entity: "Company",
  },
  {
    pattern: /\/companies\/[^/]+\/history$/,
    method: "POST",
    action: "CREATE",
    entity: "Company",
  },
  {
    pattern: /\/companies$/,
    method: "POST",
    action: "CREATE",
    entity: "Company",
  },
  {
    pattern: /\/companies\/[^/]+$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Company",
  },
  {
    pattern: /\/companies\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Company",
  },

  // ── DRIVES ───────────────────────────────────────────────────────────────
  {
    pattern: /\/drives\/[^/]+\/status$/,
    method: "PUT",
    action: "STATUS_CHANGE",
    entity: "Drive",
  },
  {
    pattern: /\/drives\/[^/]+\/jd$/,
    method: "POST",
    action: "UPLOAD",
    entity: "Drive",
  },
  {
    pattern: /\/drives\/[^/]+\/jd$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Drive",
  },
  { pattern: /\/drives$/, method: "POST", action: "CREATE", entity: "Drive" },
  {
    pattern: /\/drives\/[^/]+$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Drive",
  },
  {
    pattern: /\/drives\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Drive",
  },

  // ── APPLICATIONS ─────────────────────────────────────────────────────────
  {
    pattern: /\/applications\/apply$/,
    method: "POST",
    action: "CREATE",
    entity: "Application",
  },
  {
    pattern: /\/applications\/[^/]+\/withdraw$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Application",
  },

  // ── PIPELINE ─────────────────────────────────────────────────────────────
  {
    pattern: /\/pipeline\/bulk-move$/,
    method: "POST",
    action: "STATUS_CHANGE",
    entity: "Pipeline",
  },
  {
    pattern: /\/pipeline\/[^/]+\/move-stage$/,
    method: "PUT",
    action: "STATUS_CHANGE",
    entity: "Pipeline",
  },
  {
    pattern: /\/pipeline\/[^/]+\/reject$/,
    method: "PUT",
    action: "STATUS_CHANGE",
    entity: "Pipeline",
  },

  // ── ASSESSMENTS ──────────────────────────────────────────────────────────
  {
    pattern: /\/assessments\/[^/]+\/status$/,
    method: "PATCH",
    action: "STATUS_CHANGE",
    entity: "Assessment",
  },
  {
    pattern: /\/assessments\/[^/]+\/start$/,
    method: "POST",
    action: "STATUS_CHANGE",
    entity: "Assessment",
  },
  {
    pattern: /\/assessments$/,
    method: "POST",
    action: "CREATE",
    entity: "Assessment",
  },
  {
    pattern: /\/assessments\/[^/]+$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Assessment",
  },
  {
    pattern: /\/assessments\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Assessment",
  },

  // ── SUBMISSIONS ──────────────────────────────────────────────────────────
  {
    pattern: /\/submissions\/[^/]+\/submit$/,
    method: "POST",
    action: "CREATE",
    entity: "Assessment",
  },
  {
    pattern: /\/submissions\/[^/]+\/violation$/,
    method: "POST",
    action: "UPDATE",
    entity: "Assessment",
  },

  // ── INTERVIEWS ───────────────────────────────────────────────────────────
  {
    pattern: /\/interviews\/slots\/bulk$/,
    method: "POST",
    action: "CREATE",
    entity: "Interview",
  },
  {
    pattern: /\/interviews\/slots\/[^/]+\/book$/,
    method: "POST",
    action: "CREATE",
    entity: "Interview",
  },
  {
    pattern: /\/interviews\/slots$/,
    method: "POST",
    action: "CREATE",
    entity: "Interview",
  },
  {
    pattern: /\/interviews\/slots\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Interview",
  },
  {
    pattern: /\/interviews\/[^/]+\/reschedule$/,
    method: "PUT",
    action: "UPDATE",
    entity: "Interview",
  },
  {
    pattern: /\/interviews\/[^/]+\/cancel$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Interview",
  },
  {
    pattern: /\/interviews\/[^/]+\/result$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Interview",
  },
  {
    pattern: /\/interviews$/,
    method: "POST",
    action: "CREATE",
    entity: "Interview",
  },

  // ── OFFERS ───────────────────────────────────────────────────────────────
  {
    pattern: /\/offers\/upload$/,
    method: "POST",
    action: "UPLOAD",
    entity: "Offer",
  },
  {
    pattern: /\/offers\/[^/]+\/verify$/,
    method: "PATCH",
    action: "VERIFY",
    entity: "Offer",
  },
  {
    pattern: /\/offers\/[^/]+\/accept$/,
    method: "PATCH",
    action: "STATUS_CHANGE",
    entity: "Offer",
  },
  {
    pattern: /\/offers\/[^/]+\/reject$/,
    method: "PATCH",
    action: "STATUS_CHANGE",
    entity: "Offer",
  },
  {
    pattern: /\/offers\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Offer",
  },

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────
  {
    pattern: /\/notifications\/preferences$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Notification",
  },
  {
    pattern: /\/notifications\/mark-all-read$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Notification",
  },
  {
    pattern: /\/notifications\/[^/]+\/read$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Notification",
  },
  {
    pattern: /\/notifications\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Notification",
  },

  // ── POLICIES ─────────────────────────────────────────────────────────────
  {
    pattern: /\/policies\/reset$/,
    method: "POST",
    action: "UPDATE",
    entity: "Policy",
  },
  {
    pattern: /\/policies$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Policy",
  },

  // ── REPORTS ──────────────────────────────────────────────────────────────
  {
    pattern: /\/reports\/generate$/,
    method: "POST",
    action: "CREATE",
    entity: "Report",
  },
  {
    pattern: /\/reports\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "Report",
  },

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  {
    pattern: /\/admin\/users\/[^/]+\/role$/,
    method: "PATCH",
    action: "ROLE_CHANGE",
    entity: "User",
  },
  {
    pattern: /\/admin\/users\/[^/]+\/toggle$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "User",
  },
  {
    pattern: /\/admin\/announcements$/,
    method: "POST",
    action: "CREATE",
    entity: "System",
  },

  // ── SUCCESS STORIES (mounted at /api/v1/admin/success-stories) ───────────
  {
    pattern: /\/admin\/success-stories\/[^/]+$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "System",
  },
  {
    pattern: /\/admin\/success-stories\/[^/]+$/,
    method: "DELETE",
    action: "DELETE",
    entity: "System",
  },
  {
    pattern: /\/admin\/success-stories$/,
    method: "POST",
    action: "CREATE",
    entity: "System",
  },
];

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const resolveRoute = (method, originalUrl) => {
  const path = originalUrl.split("?")[0];
  for (const rule of ROUTE_MAP) {
    if (rule.method === method && rule.pattern.test(path)) {
      return { action: rule.action, entity: rule.entity };
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — pull the best entityId out of whatever shape the controller returns
// ─────────────────────────────────────────────────────────────────────────────
const extractEntityId = (body) => {
  const d = body?.data;
  if (!d) return null;
  return (
    d._id ||
    d.user?._id ||
    d.student?._id ||
    d.recruiter?._id ||
    d.company?._id ||
    d.drive?._id ||
    d.application?._id ||
    d.assessment?._id ||
    d.submission?._id ||
    d.interview?._id ||
    d.offer?._id ||
    d.notification?._id ||
    d.policy?._id ||
    d.report?._id ||
    d.reportId ||
    d.story?._id ||
    d.announcement?._id ||
    null
  );
};

const extractEntityTitle = (body) => {
  const d = body?.data;
  if (!d) return null;
  return (
    d.name ||
    d.title ||
    d.user?.name ||
    d.student?.user?.name ||
    d.recruiter?.user?.name ||
    d.company?.name ||
    d.drive?.title ||
    d.offer?.designation ||
    d.story?.companyName ||
    d.announcement?.title ||
    null
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// auditMiddleware
// ─────────────────────────────────────────────────────────────────────────────
const auditMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === "test" || !MUTATION_METHODS.has(req.method)) {
    return next();
  }

  const resolved = resolveRoute(req.method, req.originalUrl);
  if (!resolved) return next();

  // ── Capture statusCode before res.json fires ─────────────────────────────
  // We snapshot it here in case anything modifies it later.
  // It will be overwritten with the real value inside the interceptor anyway.
  const originalJson = res.json.bind(res);

  res.json = function auditInterceptor(body) {
    // Restore res.json immediately to avoid infinite loops
    res.json = originalJson;

    // Snapshot statusCode NOW — before originalJson() finalises the response
    const statusCode = res.statusCode;

    // Send the response first
    const result = originalJson(body);

    // Only write audit log for successful responses
    if (statusCode >= 200 && statusCode < 300) {
      const entityId = extractEntityId(body);
      const entityTitle = extractEntityTitle(body);

      // Snapshot everything we need from req before setImmediate
      const auditPayload = {
        userId: req.user?._id || null,
        userEmail: req.user?.email || null,
        userRole: req.user?.role || null,
        action: resolved.action,
        entity: resolved.entity,
        entityId: entityId ? String(entityId) : null,
        entityTitle: entityTitle || null,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip || req.headers["x-forwarded-for"] || null,
        userAgent: req.headers["user-agent"]?.slice(0, 200) || null,
        statusCode,
        message: body?.message || null,
      };

      setImmediate(() => _writeAuditLog(auditPayload));
    }

    return result;
  };

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// _writeAuditLog  — decoupled from req/res so nothing can fail silently
// ─────────────────────────────────────────────────────────────────────────────
const AuditLog = require("../models/AuditLog");

async function _writeAuditLog(p) {
  try {
    await AuditLog.create({
      user: p.userId,
      userEmail: p.userEmail,
      userRole: p.userRole,
      action: p.action,
      entity: p.entity,
      entityId: p.entityId,
      entityTitle: p.entityTitle,
      method: p.method,
      path: p.path,
      statusCode: p.statusCode,
      ip: p.ip,
      userAgent: p.userAgent,
      meta: {
        statusCode: p.statusCode,
        message: p.message,
      },
    });
  } catch (err) {
    // Never crash the app — but log the FULL error so we can diagnose
    console.error("[AuditLog] Write failed:", err.message);
    if (err.errors) {
      // Mongoose validation errors — show exactly which field failed
      Object.keys(err.errors).forEach((field) => {
        console.error(
          `  [AuditLog] Validation error on '${field}':`,
          err.errors[field].message,
        );
      });
    }
  }
}

module.exports = { auditMiddleware, resolveRoute };
