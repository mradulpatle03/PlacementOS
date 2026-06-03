// Application API layer
import api from '../lib/axios';

export const applyToDrive = (driveId, resumeId) =>
  api.post('/applications/apply', { driveId, resumeId });

export const withdrawApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/withdraw`);

export const getMyApplications = (params = {}) =>
  api.get('/applications/my', { params });

export const getApplicationsByDrive = (driveId, params = {}) =>
  api.get(`/applications/drive/${driveId}`, { params });