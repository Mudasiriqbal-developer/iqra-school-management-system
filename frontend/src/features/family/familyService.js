import api from '../../services/api';

/**
 * Fetch list of families with pagination and optional search filter.
 * @param {Object} params - { search, page, limit }
 */
export const getFamilies = async (params) => {
  const response = await api.get('/families', { params });
  return response.data;
};

/**
 * Fetch a single family detail with populated students.
 * @param {string} id - Family MongoDB ID
 */
export const getFamilyById = async (id) => {
  const response = await api.get(`/families/${id}`);
  return response.data;
};

/**
 * Create a new family tree group.
 * @param {Object} data - { familyName, guardianName, contactNumber, alternateContact, address, studentIds, notes, reassign }
 */
export const createFamily = async (data) => {
  const response = await api.post('/families', data);
  return response.data;
};

/**
 * Update family metadata.
 * @param {string} id - Family MongoDB ID
 * @param {Object} data - { familyName, guardianName, contactNumber, alternateContact, address, notes }
 */
export const updateFamily = async (id, data) => {
  const response = await api.put(`/families/${id}`, data);
  return response.data;
};

/**
 * Link/unlink/reassign students from/to a family.
 * @param {string} id - Family MongoDB ID
 * @param {Object} data - { add: [studentIds], remove: [studentIds], reassign: boolean }
 */
export const updateFamilyStudents = async (id, data) => {
  const response = await api.patch(`/families/${id}/students`, data);
  return response.data;
};

/**
 * Delete a family (unlinks all students, does not delete student records).
 * @param {string} id - Family MongoDB ID
 */
export const deleteFamily = async (id) => {
  const response = await api.delete(`/families/${id}`);
  return response.data;
};

/**
 * Fetch outstanding fee summary for all students in a family.
 * @param {string} id - Family MongoDB ID
 */
export const getFamilyFeeSummary = async (id) => {
  const response = await api.get(`/families/${id}/fee-summary`);
  return response.data;
};

/**
 * Fetch outstanding books summary for all students in a family.
 * @param {string} id - Family MongoDB ID
 */
export const getFamilyBooksSummary = async (id) => {
  const response = await api.get(`/families/${id}/books-summary`);
  return response.data;
};

/**
 * Record a combined payment for the family.
 * @param {string} id - Family MongoDB ID
 * @param {Object} data - { selectedFeeRecordIds: [], amount: number, paymentMethod: string }
 */
export const payFamilyFees = async (id, data) => {
  const response = await api.post(`/families/${id}/pay`, data);
  return response.data;
};

/**
 * Download a PDF family payment voucher.
 * @param {string} familyId - Family ID
 * @param {string} voucherId - Voucher ID
 * @param {string} fileName - Destination filename
 */
export const downloadFamilyVoucherPDF = async (familyId, voucherId, fileName) => {
  const response = await api.get(`/families/${familyId}/vouchers/${voucherId}/pdf`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || `family-voucher-${voucherId}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
