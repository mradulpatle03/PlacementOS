import api from '@/lib/axios';

export const recruiterAPI = {
  getMyProfile: () => api.get('/recruiters/me'),
  updateMyProfile: (data) => api.put('/recruiters/me', data),
  getAllRecruiters: (params) => api.get('/recruiters', { params }),
  getPendingRecruiters: () => api.get('/recruiters/pending'),
  getRecruiterById: (id) => api.get(`/recruiters/${id}`),
  verifyRecruiter: (id, data) => api.put(`/recruiters/${id}/verify`, data),
};