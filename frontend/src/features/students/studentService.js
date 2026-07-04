import api from '../../services/api';

/**
 * Fetch all students with optional search, filtering, and pagination parameters.
 * @param {Object} params - Query parameters (classId, sectionId, status, search, page, limit)
 */
export const getStudents = async (params) => {
  const response = await api.get('/students', { params });
  return response.data;
};

/**
 * Fetch a single student by ID.
 * @param {string} id - Student MongoDB ID
 */
export const getStudentById = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

/**
 * Create a new student record.
 * @param {Object} data - Student details payload
 */
export const createStudent = async (data) => {
  const response = await api.post('/students', data);
  return response.data;
};

/**
 * Update an existing student record by ID.
 * @param {string} id - Student MongoDB ID
 * @param {Object} data - Update payload
 */
export const updateStudent = async (id, data) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

/**
 * Soft delete a student by deactivating their status.
 * @param {string} id - Student MongoDB ID
 */
export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

/**
 * Fetch all classes for dropdown menus.
 */
export const getClasses = async () => {
  const response = await api.get('/classes');
  return response.data;
};

/**
 * Fetch sections for a specific class.
 * @param {string} classId - Class MongoDB ID
 */
export const getSectionsByClass = async (classId) => {
  const response = await api.get('/sections', { params: { classId } });
  return response.data;
};
