import api from "@/lib/axios";

export const publicAPI = {
  getStats: () => api.get("/public/stats"),
  getRecruiters: () => api.get("/public/recruiters"),
  getSuccessStories: (params = {}) =>
    api.get("/public/success-stories", { params }),
};

export const successStoryAdminAPI = {
  getAll: () => api.get("/admin/success-stories"),
  create: (formData) =>
    api.post("/admin/success-stories", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.patch(`/admin/success-stories/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id) => api.delete(`/admin/success-stories/${id}`),
};
