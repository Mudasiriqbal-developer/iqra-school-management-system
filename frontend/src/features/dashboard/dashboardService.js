import api from '../../services/api';

/**
 * Fetch dashboard summary statistics.
 * @returns {Promise<Object>} Dashboard summary data
 */
export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

/**
 * Fetch fee summary statistics.
 * @returns {Promise<Object>} Fee summary data
 */
export const getFeesSummary = async () => {
  const response = await api.get('/fees/summary');
  return response.data;
};

/**
 * Download individual student fee receipt as PDF.
 * @param {string} studentId
 * @param {string} [regNo]
 */
export const downloadStudentReceiptPDF = async (studentId, regNo) => {
  const response = await api.get(`/fee-records/student/${studentId}/receipt-pdf`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${regNo ? regNo.toUpperCase() : 'student'}-fee-receipt.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download batch fee audit report as PDF.
 * @param {'collected'|'partial'} type
 * @param {string} [search]
 */
export const downloadBatchAuditPDF = async (type, search = '') => {
  const params = { type };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const response = await api.get('/fees/drilldown/export-pdf', {
    params,
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${type === 'collected' ? 'collected-fees' : 'partial-dues'}-audit-report.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
