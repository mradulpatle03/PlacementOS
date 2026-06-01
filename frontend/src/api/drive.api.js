import api from '@/lib/axios';

export const driveAPI = {
  getAll: (params) => api.get('/drives', { params }),
  getById: (id) => api.get(`/drives/${id}`),
  create: (data) => api.post('/drives', data),
  update: (id, data) => api.put(`/drives/${id}`, data),
  delete: (id) => api.delete(`/drives/${id}`),
  updateStatus: (id, status) => api.put(`/drives/${id}/status`, { status }),
  uploadJD: (id, formData) => api.post(`/drives/${id}/jd`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteJD: (id) => api.delete(`/drives/${id}/jd`),
  getJDPreviewUrl: (id) => `/api/v1/drives/${id}/jd/preview`,
  getSummary: (id) => api.get(`/drives/${id}/summary`),
  getStats: () => api.get('/drives/stats'),
  getUpcoming: () => api.get('/drives/upcoming'),
  getEligibility: (id) => api.get(`/drives/${id}/check-eligibility`),
};