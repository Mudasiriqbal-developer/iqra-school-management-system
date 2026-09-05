import api from '../../services/api';
import { getClasses, getSectionsByClass, getStudents } from '../students/studentService';

/**
 * Fetch books management summary KPIs (totalBilled, totalCollected, totalOutstanding, counts).
 */
export const getBookSummary = async () => {
  const response = await api.get('/books/summary');
  return response.data;
};

/**
 * Fetch paginated list of student book dues and payment records.
 * @param {Object} params - { page, limit, classId, sectionId, status, search, academicYear }
 */
export const getBookDues = async (params) => {
  const response = await api.get('/books/dues', { params });
  return response.data;
};

/**
 * Record a book fee payment with idempotency key.
 * @param {string} id - BookFee MongoDB ID
 * @param {Object} data - { type, amount, method, note, idempotencyKey }
 */
export const recordBookPayment = async (id, data) => {
  const response = await api.post(`/books/${id}/pay`, data);
  return response.data;
};

/**
 * Download official PDF payment receipt for a BookFee record.
 * @param {string} id - BookFee MongoDB ID
 * @param {string} filename - Filename for download
 */
export const downloadBookReceipt = async (id, filename = 'book-fee-receipt.pdf') => {
  const response = await api.get(`/books/${id}/receipt-pdf`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download official Book Fees & Dues PDF Report.
 * @param {Object} params - { type, classId, search, academicYear }
 * @param {string} filename - Filename for download
 */
export const downloadBookReportPDF = async (params = {}, filename = 'book-dues-report.pdf') => {
  const response = await api.get('/books/report-pdf', {
    params,
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Issue new book charge to single student or entire class.
 * @param {Object} data - { targetType, studentId, classId, sectionId, amount, dueDate, items, academicYear }
 */
export const issueBookCharge = async (data) => {
  const response = await api.post('/books/issue', data);
  return response.data;
};

export { getClasses, getSectionsByClass, getStudents };
