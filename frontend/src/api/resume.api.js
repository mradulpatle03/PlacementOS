import api from '@/lib/axios';

export const resumeAPI = {
  upload: (formData) => api.post('/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMyResumes: () => api.get('/resumes'),
  deleteResume: (id) => api.delete(`/resumes/${id}`),
  setPrimary: (id) => api.put(`/resumes/${id}/primary`),
  updateLabel: (id, label) => api.put(`/resumes/${id}/label`, { label }),
  getScore: (id) => api.get(`/resumes/${id}/score`),
  getPreviewUrl: (id) => `${import.meta.env.VITE_API_URL || '/api/v1'}/resumes/${id}/preview`,
};