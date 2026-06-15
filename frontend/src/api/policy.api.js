import api from '@/lib/axios';

export const policyAPI = {
  // Any authenticated user
  get: () => api.get('/policies'),

  // TPO / Admin only
  update: (data) => api.patch('/policies', data),

  // TPO / Admin only
  reset: () => api.post('/policies/reset'),
};