import api from "@/lib/axios";

export const reportAPI = {
  generate: (data) => api.post("/reports/generate", data),
  getAll: (params = {}) => api.get("/reports", { params }),
  getById: (id) => api.get(`/reports/${id}`),
  delete: (id) => api.delete(`/reports/${id}`),
  getFields: () => api.get("/reports/fields"),
  countPreview: (params = {}) => api.get("/reports/count-preview", { params }),
};
