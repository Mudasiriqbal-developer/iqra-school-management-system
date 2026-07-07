import api from '../../services/api';

/**
 * Fetch filtered list of expenses.
 * @param {Object} params - { category, searchTerm, startDate, endDate, page, limit }
 */
export const getExpenses = async (params = {}) => {
  const response = await api.get('/expenses', { params });
  return response.data;
};

/**
 * Create a new expense record.
 * @param {Object} data - { title, category, amount, date, description, paidTo }
 */
export const createExpense = async (data) => {
  const response = await api.post('/expenses', data);
  return response.data;
};

/**
 * Update an existing expense record.
 * @param {string} id - Expense ID
 * @param {Object} data - { title, category, amount, date, description, paidTo }
 */
export const updateExpense = async (id, data) => {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data;
};

/**
 * Delete an expense record.
 * @param {string} id - Expense ID
 */
export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

/**
 * Fetch monthly payroll overview.
 * @param {string} month - Format "YYYY-MM" (e.g. "2026-07")
 */
export const getPayrollOverview = async (month) => {
  const response = await api.get('/payroll', { params: { month } });
  return response.data;
};

/**
 * Record/process a teacher salary payout.
 * @param {Object} data - { teacherId, month, allowances, deductions, paymentMethod, status }
 */
export const processSalaryPayout = async (data) => {
  const response = await api.post('/payroll', data);
  return response.data;
};

/**
 * Fetch salary history logs for a teacher.
 * @param {string} teacherId - Teacher MongoDB ID
 */
export const getPayrollHistory = async (teacherId) => {
  const response = await api.get(`/payroll/history/${teacherId}`);
  return response.data;
};
