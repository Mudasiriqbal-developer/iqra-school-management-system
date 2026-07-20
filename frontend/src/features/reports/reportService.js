import api from '../../services/api';

/**
 * Fetch list of fee defaulters with optional class and section filters.
 * @param {string} classId - MongoDB ID of the Class
 * @param {string} sectionId - MongoDB ID of the Section
 */
export const getFeeDefaulters = async (classId, sectionId) => {
  const params = {};
  if (classId) params.classId = classId;
  if (sectionId) params.sectionId = sectionId;

  const response = await api.get('/reports/fee-defaulters', { params });
  return response.data;
};

/**
 * Fetch class-wise attendance summary for a given date range.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export const getAttendanceSummary = async (startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await api.get('/reports/attendance-summary', { params });
  return response.data;
};

/**
 * Download Monthly Collections report as CSV and save to local machine.
 * @param {number|string} month - Month (1-12)
 * @param {number|string} year - Year (e.g. 2026)
 */
export const downloadCollectionsCSV = async (month, year) => {
  const response = await api.get('/reports/collections/export', {
    params: { month, year },
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `collections-${month}-${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download Monthly Collections report as PDF and save to local machine.
 * @param {number|string} month - Month (1-12)
 * @param {number|string} year - Year (e.g. 2026)
 */
export const downloadCollectionsPDF = async (month, year) => {
  const response = await api.get('/reports/collections/export-pdf', {
    params: { month, year },
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `collections-${month}-${year}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download Fee Defaulters report as PDF and save to local machine.
 * @param {string} classId - MongoDB ID of the Class
 * @param {string} sectionId - MongoDB ID of the Section
 */
export const downloadDefaultersPDF = async (classId, sectionId) => {
  const params = {};
  if (classId) params.classId = classId;
  if (sectionId) params.sectionId = sectionId;

  const response = await api.get('/reports/fee-defaulters/export-pdf', {
    params,
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'fee-defaulters-report.pdf');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
