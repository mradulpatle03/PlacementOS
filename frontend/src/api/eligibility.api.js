import api from '../lib/axios';

export const getEligibleStudents = (driveId, params = {}) =>
  api.get(`/drives/${driveId}/eligible-students`, { params });

export const exportEligibleStudents = async (driveId, driveTitle) => {
  const response = await api.get(`/drives/${driveId}/eligible-students/export`, {
    responseType: 'blob',
  });

  // trigger browser download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `eligible_students_${driveTitle || driveId}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};