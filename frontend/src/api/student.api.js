import api from '@/lib/axios';

export const studentAPI = {
  getMyProfile: () => api.get('/students/me'),
  updateMyProfile: (data) => api.put('/students/me', data),
  updateSkills: (skills) => api.put('/students/me/skills', { skills }),
  addProject: (data) => api.post('/students/me/projects', data),
  updateProject: (projectId, data) => api.put(`/students/me/projects/${projectId}`, data),
  deleteProject: (projectId) => api.delete(`/students/me/projects/${projectId}`),
  getCompleteness: () => api.get('/students/me/completeness'),
};