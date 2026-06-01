import api from '@/lib/axios';

export const companyAPI = {
  getAll: (params) => api.get('/companies', { params }),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  uploadLogo: (id, formData) => api.post(`/companies/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStats: (id) => api.get(`/companies/${id}/stats`),
  getHistory: (id) => api.get(`/companies/${id}/history`),
  addHistory: (id, data) => api.post(`/companies/${id}/history`, data),
  linkRecruiter: (id, recruiterId) => api.post(`/companies/${id}/recruiters`, { recruiterId }),
  unlinkRecruiter: (id, recruiterId) => api.delete(`/companies/${id}/recruiters/${recruiterId}`),
  getRecruiters: (id) => api.get(`/companies/${id}/recruiters`),
};