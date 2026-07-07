import api from '../../services/api';

/**
 * Submit a new leave request (Teacher).
 * @param {Object} data - { startDate, endDate, category, reason }
 */
export const submitLeave = async (data) => {
  const response = await api.post('/leaves', data);
  return response.data;
};

/**
 * Fetch leave requests of the currently logged-in teacher (Teacher).
 */
export const getMyLeaves = async () => {
  const response = await api.get('/leaves/my-leaves');
  return response.data;
};

/**
 * Fetch pending leave requests for review (Admin).
 */
export const getPendingLeaves = async () => {
  const response = await api.get('/leaves/admin/pending');
  return response.data;
};

/**
 * Fetch all leave requests with optional filters (Admin).
 * @param {Object} [params] - { status, category, teacherId }
 */
export const getAllLeaves = async (params = {}) => {
  const response = await api.get('/leaves/admin/all', { params });
  return response.data;
};

/**
 * Approve or reject a leave request (Admin).
 * @param {string} id - Leave request MongoDB ID
 * @param {Object} data - { status: 'approved' | 'rejected', adminComments }
 */
export const updateLeaveStatus = async (id, data) => {
  const response = await api.put(`/leaves/admin/${id}/status`, data);
  return response.data;
};
