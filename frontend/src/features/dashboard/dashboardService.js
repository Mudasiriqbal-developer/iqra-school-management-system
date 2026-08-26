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
