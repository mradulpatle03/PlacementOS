const { log } = require("../utils/auditLogger");

// ── map route patterns to entity + action ─────────────────────

const ROUTE_MAP = [
  // Auth
  {
    pattern: /^\/api\/v1\/auth\/login$/,
    method: "POST",
    action: "LOGIN",
    entity: "Auth",
  },
  {
    pattern: /^\/api\/v1\/auth\/logout$/,
    method: "POST",
    action: "LOGOUT",
    entity: "Auth",
  },
  {
    pattern: /^\/api\/v1\/auth\/register$/,
    method: "POST",
    action: "CREATE",
    entity: "User",
  },
  {
    pattern: /^\/api\/v1\/auth\/reset-password$/,
    method: "POST",
    action: "UPDATE",
    entity: "Auth",
  },

  // Students
  {
    pattern: /^\/api\/v1\/students/,
    method: "POST",
    action: "CREATE",
    entity: "Student",
  },
  {
    pattern: /^\/api\/v1\/students/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Student",
  },
  {
    pattern: /^\/api\/v1\/students/,
    method: "DELETE",
    action: "DELETE",
    entity: "Student",
  },

  // Recruiters
  {
    pattern: /^\/api\/v1\/recruiters/,
    method: "POST",
    action: "CREATE",
    entity: "Recruiter",
  },
  {
    pattern: /^\/api\/v1\/recruiters/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Recruiter",
  },
  {
    pattern: /\/verify/,
    method: "PATCH",
    action: "VERIFY",
    entity: "Recruiter",
  },

  // Companies
  {
    pattern: /^\/api\/v1\/companies/,
    method: "POST",
    action: "CREATE",
    entity: "Company",
  },
  {
    pattern: /^\/api\/v1\/companies/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Company",
  },
  {
    pattern: /^\/api\/v1\/companies/,
    method: "DELETE",
    action: "DELETE",
    entity: "Company",
  },

  // Drives
  {
    pattern: /^\/api\/v1\/drives/,
    method: "POST",
    action: "CREATE",
    entity: "Drive",
  },
  {
    pattern: /^\/api\/v1\/drives/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Drive",
  },
  {
    pattern: /^\/api\/v1\/drives/,
    method: "DELETE",
    action: "DELETE",
    entity: "Drive",
  },
  {
    pattern: /\/status$/,
    method: "PATCH",
    action: "STATUS_CHANGE",
    entity: "Drive",
  },

  // Applications
  {
    pattern: /^\/api\/v1\/applications\/apply$/,
    method: "POST",
    action: "CREATE",
    entity: "Application",
  },
  {
    pattern: /\/withdraw$/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Application",
  },

  // Pipeline
  {
    pattern: /^\/api\/v1\/pipeline/,
    method: "PUT",
    action: "STATUS_CHANGE",
    entity: "Pipeline",
  },
  {
    pattern: /^\/api\/v1\/pipeline/,
    method: "POST",
    action: "STATUS_CHANGE",
    entity: "Pipeline",
  },

  // Assessments
  {
    pattern: /^\/api\/v1\/assessments/,
    method: "POST",
    action: "CREATE",
    entity: "Assessment",
  },
  {
    pattern: /^\/api\/v1\/assessments/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Assessment",
  },
  {
    pattern: /^\/api\/v1\/assessments/,
    method: "DELETE",
    action: "DELETE",
    entity: "Assessment",
  },

  // Interviews
  {
    pattern: /^\/api\/v1\/interviews/,
    method: "POST",
    action: "CREATE",
    entity: "Interview",
  },
  {
    pattern: /^\/api\/v1\/interviews/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Interview",
  },

  // Offers
  {
    pattern: /\/offers\/upload$/,
    method: "POST",
    action: "UPLOAD",
    entity: "Offer",
  },
  {
    pattern: /\/offers\/.*\/verify$/,
    method: "PATCH",
    action: "VERIFY",
    entity: "Offer",
  },
  {
    pattern: /\/offers\/.*\/accept$/,
    method: "PATCH",
    action: "STATUS_CHANGE",
    entity: "Offer",
  },
  {
    pattern: /\/offers\/.*\/reject$/,
    method: "PATCH",
    action: "STATUS_CHANGE",
    entity: "Offer",
  },
  {
    pattern: /^\/api\/v1\/offers/,
    method: "DELETE",
    action: "DELETE",
    entity: "Offer",
  },

  // Reports
  {
    pattern: /^\/api\/v1\/reports\/generate$/,
    method: "POST",
    action: "CREATE",
    entity: "Report",
  },

  // Policy
  {
    pattern: /^\/api\/v1\/policies/,
    method: "PATCH",
    action: "UPDATE",
    entity: "Policy",
  },

  // Resumes
  {
    pattern: /^\/api\/v1\/resumes/,
    method: "POST",
    action: "UPLOAD",
    entity: "Resume",
  },
  {
    pattern: /^\/api\/v1\/resumes/,
    method: "DELETE",
    action: "DELETE",
    entity: "Resume",
  },
];

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * resolveRoute(method, path)
 * Returns { action, entity } or null if route not mapped.
 */
const resolveRoute = (method, path) => {
  for (const rule of ROUTE_MAP) {
    if (rule.method === method && rule.pattern.test(path)) {
      return { action: rule.action, entity: rule.entity };
    }
  }
  return null;
};

/**
 * auditMiddleware
 *
 * Attached globally — intercepts the response and logs mutations.
 * Only fires for successful (2xx) mutating requests.
 * Skipped in test environment.
 */
const auditMiddleware = (req, res, next) => {
  // skip in tests and for GET requests
  if (process.env.NODE_ENV === "test" || !MUTATION_METHODS.has(req.method)) {
    return next();
  }

  const resolved = resolveRoute(req.method, req.path);
  if (!resolved) return next(); // unmapped route — skip

  // intercept response finish to log after send
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    res.json = originalJson;
    const result = originalJson(body);

    // only log successful mutations (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // extract entityId from body if available
      const entityId =
        body?.data?._id ||
        body?.data?.drive?._id ||
        body?.data?.offer?._id ||
        body?.data?.report?._id ||
        body?.data?.reportId ||
        null;

      const entityTitle =
        body?.data?.name ||
        body?.data?.title ||
        body?.data?.drive?.title ||
        null;

      setImmediate(() =>
        log({
          req,
          action: resolved.action,
          entity: resolved.entity,
          entityId: entityId ? String(entityId) : null,
          entityTitle: entityTitle || null,
          meta: {
            statusCode: res.statusCode,
            body: body?.message || null,
          },
        }),
      );
    }

    return result;
  };

  next();
};

module.exports = { auditMiddleware, resolveRoute };
