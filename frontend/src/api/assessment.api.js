import api from '@/lib/axios';

export const assessmentAPI = {
  // TPO/Recruiter CRUD
  create: (data) => api.post('/assessments', data),
  getByDrive: (driveId) => api.get(`/assessments/drive/${driveId}`),
  getById: (id) => api.get(`/assessments/${id}`),
  update: (id, data) => api.put(`/assessments/${id}`, data),
  delete: (id) => api.delete(`/assessments/${id}`),
  updateStatus: (id, status) => api.patch(`/assessments/${id}/status`, { status }),

  // Student — start + fetch own result
  start: (id) => api.post(`/assessments/${id}/start`),
  getMySubmission: (id) => api.get(`/assessments/${id}/my-submission`),

  // TPO/Recruiter — all submissions
  getSubmissions: (id) => api.get(`/assessments/${id}/submissions`),

  // Score aggregation + leaderboard  ← new
  getStats: (id, params = {}) =>
    api.get(`/assessments/${id}/stats`, { params }),

  // Export OA results  ← new
  exportResults: (id, format = 'xlsx') =>
    api.get(`/assessments/${id}/export`, {
      params: { format },
      responseType: 'blob',   // important for file download
    }),
};

export const submissionAPI = {
  submit: (submissionId, data) =>
    api.post(`/submissions/${submissionId}/submit`, data),

  logViolation: (submissionId, type) =>
    api.post(`/submissions/${submissionId}/violation`, { type }),

  runCode: (code, language, input = '') =>
    api.post('/submissions/run-code', { code, language, input }),

  getById: (submissionId) => api.get(`/submissions/${submissionId}`),
};