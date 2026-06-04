import api from "@/lib/axios";

export const pipelineAPI = {
  // get all applications for a drive grouped by stage
  getByDrive: (driveId) => api.get(`/pipeline/drive/${driveId}`),

  // get canonical stage list
  getStages: () => api.get("/pipeline/stages"),

  // move a single application to a new stage
  moveStage: (applicationId, targetStage, note = "") =>
    api.put(`/pipeline/${applicationId}/move-stage`, { targetStage, note }),

  // bulk move multiple applications to same target stage
  bulkMove: (applicationIds, targetStage, note = "") =>
    api.post("/pipeline/bulk-move", {
      applicationIds: [...applicationIds],
      targetStage,
      note,
    }),

  // get full stage history for one application
  getHistory: (applicationId) => api.get(`/pipeline/${applicationId}/history`),

  // reject with mandatory reason
  reject: (applicationId, reason) =>
    api.put(`/pipeline/${applicationId}/reject`, { reason }),

  // returns a URL string for window.open — triggers file download
  exportStageUrl: (driveId, stage, format = "xlsx") => {
    const params = new URLSearchParams({ format });
    if (stage) params.set("stage", stage);
    return `/api/v1/pipeline/drive/${driveId}/export?${params.toString()}`;
  },
};
