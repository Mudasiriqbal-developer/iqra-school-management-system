import api from '../../services/api';

/**
 * Validates the account activation token.
 * @param {string} token - The raw activation token from URL params.
 */
export const validateActivationToken = async (token) => {
  const response = await api.get(`/auth/activate/${token}`);
  return response.data;
};

/**
 * Activates the user account and sets the password.
 * @param {string} token - The raw activation token.
 * @param {string} password - The chosen password.
 */
export const activateAccount = async (token, password) => {
  const response = await api.post(`/auth/activate/${token}`, { password });
  return response.data;
};
