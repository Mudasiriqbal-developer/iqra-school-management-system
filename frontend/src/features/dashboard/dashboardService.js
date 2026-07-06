import api from '../../services/api';

/**
 * Fetch dashboard summary statistics.
 * @returns {Promise<Object>} Dashboard summary data
 */
export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};
