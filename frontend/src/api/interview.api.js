import api from "@/lib/axios";

export const interviewAPI = {
  // ── Slots (recruiter/TPO) ─────────────────────────────────
  createSlot: (data) => api.post("/interviews/slots", data),
  createBulkSlots: (slots) => api.post("/interviews/slots/bulk", { slots }),
  getSlots: (driveId, round) =>
    api.get("/interviews/slots", { params: { driveId, round } }),
  deleteSlot: (slotId) => api.delete(`/interviews/slots/${slotId}`),

  // ── Slots (student) ───────────────────────────────────────
  getAvailableSlots: (driveId, round) =>
    api.get("/interviews/slots/available", { params: { driveId, round } }),
  bookSlot: (slotId, applicationId) =>
    api.post(`/interviews/slots/${slotId}/book`, { applicationId }),

  // ── Interviews (recruiter/TPO) ────────────────────────────
  schedule: (data) => api.post("/interviews", data),
  getByDrive: (driveId, params = {}) =>
    api.get("/interviews", { params: { driveId, ...params } }),
  getById: (id) => api.get(`/interviews/${id}`),
  reschedule: (id, data) => api.put(`/interviews/${id}/reschedule`, data),
  cancel: (id, reason) => api.patch(`/interviews/${id}/cancel`, { reason }),
  recordResult: (id, data) => api.patch(`/interviews/${id}/result`, data),

  // ── Student ───────────────────────────────────────────────
  getMyInterviews: () => api.get("/interviews/my"),
};
