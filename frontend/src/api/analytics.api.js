import api from "@/lib/axios";

export const analyticsAPI = {
  getTpo: (params = {}) => api.get("/analytics/tpo", { params }),
  getBranch: (branch, params = {}) =>
    api.get(`/analytics/branch/${branch}`, { params }),
  getCompany: (id) => api.get(`/analytics/company/${id}`),
  getStudentMe: () => api.get("/analytics/student/me"),
  getOverallFunnel: (params = {}) => api.get("/analytics/funnel", { params }),
  getDriveFunnel: (id) => api.get(`/analytics/funnel/drive/${id}`),
  getDriveConversion: (params = {}) =>
    api.get("/analytics/funnel/drives", { params }),
  getCacheStatus: () => api.get("/analytics/cache/status"),
  invalidateCache: () => api.post("/analytics/cache/invalidate"),
};
