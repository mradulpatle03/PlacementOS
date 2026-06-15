import api from "@/lib/axios";

export const adminAPI = {
  // audit logs
  getAuditLogs: (params = {}) => api.get("/admin/audit", { params }),
  getAuditLogById: (id) => api.get(`/admin/audit/${id}`),
  getAuditStats: (params = {}) => api.get("/admin/audit/stats", { params }),
};