import api from '../../services/api';
import { getStudents, getClasses, getSectionsByClass } from '../students/studentService';

/**
 * Fetch fee summary dashboard stats.
 * @param {string} [classId] - Filter by Class MongoDB ID
 * @param {string} [sectionId] - Filter by Section MongoDB ID
 */
export const getFeeSummary = async (classId, sectionId) => {
  const params = {};
  if (classId) params.classId = classId;
  if (sectionId) params.sectionId = sectionId;

  const response = await api.get('/students/fee-summary', { params });
  return response.data;
};

/**
 * Set the fee structure for a specific student.
 * @param {string} studentId - Student MongoDB ID
 * @param {Object} data - { amountDue, dueDate }
 */
export const setFeeStructure = async (studentId, data) => {
  const response = await api.patch(`/students/${studentId}/fee-structure`, data);
  return response.data;
};

/**
 * Record a payment for a specific student.
 * @param {string} studentId - Student MongoDB ID
 * @param {Object} data - { amount, method, paidOn }
 */
export const recordPayment = async (studentId, data) => {
  const response = await api.post(`/students/${studentId}/fee-payment`, data);
  return response.data;
};

// Re-export student service helper methods for use in fee components
export { getStudents, getClasses, getSectionsByClass };
