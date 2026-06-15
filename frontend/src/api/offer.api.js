import api from "@/lib/axios";

export const offerAPI = {
  // Recruiter / TPO — upload offer letter PDF
  // data: FormData with fields: offerLetter (file), applicationId, ctc, joiningDate,
  //       designation, location, responseDeadline
  upload: (formData) =>
    api.post("/offers/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // TPO — verify an uploaded offer
  verify: (id) => api.patch(`/offers/${id}/verify`),

  // Student — accept offer
  accept: (id) => api.patch(`/offers/${id}/accept`),

  // Student — reject offer
  reject: (id, reason = "") => api.patch(`/offers/${id}/reject`, { reason }),

  // TPO / Recruiter — all offers for a drive
  getByDrive: (driveId, params = {}) =>
    api.get(`/offers/drive/${driveId}`, { params }),

  // Student — own offers
  getMy: () => api.get("/offers/my"),

  // Any role — single offer detail
  getById: (id) => api.get(`/offers/${id}`),

  // TPO — delete offer
  delete: (id) => api.delete(`/offers/${id}`),
};
