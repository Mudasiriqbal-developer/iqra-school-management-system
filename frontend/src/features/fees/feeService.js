import api from '../../services/api';
import { getStudents, getClasses, getSectionsByClass } from '../students/studentService';

/**
 * Fetch bulk listing of current month's fee records for all active students with filters/pagination.
 * @param {Object} params - { classId, sectionId, status, search, page, limit }
 */
export const getCurrentMonthFeeList = async (params) => {
  const response = await api.get('/fee-records/current-month', { params });
  return response.data;
};

/**
 * Fetch all monthly records (ledger) for a specific student.
 * @param {string} studentId - Student MongoDB ID
 */
export const getStudentLedger = async (studentId) => {
  const response = await api.get(`/fee-records/student/${studentId}`);
  return response.data;
};

/**
 * Record a payment on a specific monthly fee record.
 * @param {string} feeRecordId - FeeRecord MongoDB ID
 * @param {Object} data - { type: 'full'|'half'|'custom', amount, method }
 */
export const recordPayment = async (feeRecordId, data) => {
  const response = await api.post(`/fee-records/${feeRecordId}/pay`, data);
  return response.data;
};

/**
 * Set the monthly recurring fee amount for a student.
 * @param {string} studentId - Student MongoDB ID
 * @param {number} monthlyFeeAmount - Recurring monthly fee
 */
export const setMonthlyFee = async (studentId, monthlyFeeAmount) => {
  const response = await api.patch(`/students/${studentId}/monthly-fee`, { monthlyFeeAmount });
  return response.data;
};

/**
 * Download a PDF payment receipt for a student.
 * @param {string} studentId - Student MongoDB ID
 * @param {string} studentName - Student's Name (for the downloaded filename)
 */
export const downloadReceipt = async (studentId, studentName) => {
  const response = await api.get(`/fee-records/student/${studentId}/receipt-pdf`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${studentName.replace(/\s+/g, '_')}-fee-receipt.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Issue a one-time charge (e.g. Exam Fee, Paper Fee) to class/section or individual students.
 * @param {Object} data - { title, amount, dueDate, targetType, classId, sectionId, studentIds }
 */
export const issueOneTimeCharge = async (data) => {
  const response = await api.post('/fee-records/issue-charge', data);
  return response.data;
};

/**
 * Fetch one-time charges report with filters & summary KPIs.
 * @param {Object} params - { classId, sectionId, status, search, title, page, limit }
 */
export const getOneTimeCharges = async (params) => {
  const response = await api.get('/fee-records/one-time-charges', { params });
  return response.data;
};

/**
 * Update an unpaid one-time charge (title, amountDue, dueDate).
 * @param {string} id - FeeRecord ID
 * @param {Object} data - { title, amountDue, dueDate }
 */
export const updateOneTimeCharge = async (id, data) => {
  const response = await api.put(`/fee-records/${id}/one-time`, data);
  return response.data;
};

/**
 * Delete / void an unpaid one-time charge.
 * @param {string} id - FeeRecord ID
 */
export const deleteOneTimeCharge = async (id) => {
  const response = await api.delete(`/fee-records/${id}/one-time`);
  return response.data;
};

// Re-export student service helper methods
export { getStudents, getClasses, getSectionsByClass };
