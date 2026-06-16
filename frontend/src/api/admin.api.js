import api from "@/lib/axios";

export const adminAPI = {
  // user management
  getUsers: (params = {}) => api.get("/admin/users", { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleActive: (id) => api.patch(`/admin/users/${id}/toggle`),

  // announcements
  broadcast: (data) => api.post("/admin/announcements", data),
  getAnnouncements: () => api.get("/admin/announcements"),
  getActive: () => api.get("/announcements/active"),

  // audit logs
  getAuditLogs: (params = {}) => api.get("/admin/audit", { params }),
  getAuditLogById: (id) => api.get(`/admin/audit/${id}`),
  getAuditStats: (params = {}) => api.get("/admin/audit/stats", { params }),
};
