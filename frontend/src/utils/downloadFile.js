/**
 * Trigger a file download from a blob response.
 * Usage:
 *   const res = await assessmentAPI.exportResults(id, 'xlsx');
 *   downloadFile(res.data, `OA_Results.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 */
export const downloadFile = (blobData, filename, mimeType) => {
  const blob = new Blob([blobData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Mime type helpers
export const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  pdf: 'application/pdf',
};