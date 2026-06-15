import api from "@/lib/axios";

export const reportAPI = {
  // queue a new report
  generate: (data) => api.post("/reports/generate", data),

  // list my reports (paginated)
  getAll: (params = {}) => api.get("/reports", { params }),

  // single report status / download link
  getById: (id) => api.get(`/reports/${id}`),

  // delete
  delete: (id) => api.delete(`/reports/${id}`),

  // available fields for custom report builder
  getFields: () => api.get("/reports/fields"),

  // how many rows a custom report would produce
  countPreview: (params = {}) => api.get("/reports/count-preview", { params }),
};
