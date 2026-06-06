import api from "@/lib/axios";

export const notificationAPI = {
  getAll: (params = {}) => api.get("/notifications", { params }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/mark-all-read"),
  deleteOne: (id) => api.delete(`/notifications/${id}`),

  // preferences
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data) => api.patch("/notifications/preferences", data),
};
