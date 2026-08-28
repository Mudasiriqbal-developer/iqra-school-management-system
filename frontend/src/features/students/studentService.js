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

/**
 * Download a PDF admission receipt for a student.
 * @param {string} studentId - Student MongoDB ID
 * @param {string} registrationNumber - Student's Registration Number (for the downloaded filename)
 */
export const downloadAdmissionReceipt = async (studentId, registrationNumber) => {
  const response = await api.get(`/students/${studentId}/admission-receipt-pdf`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${registrationNumber}-admission-receipt.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Reset a student's password by Admin.
 * @param {string} id - Student ID
 * @param {string} password - New password
 */
export const resetStudentPassword = async (id, password) => {
  const response = await api.put(`/students/${id}/reset-password`, { password });
  return response.data;
};

/**
 * Download the Excel template for bulk student import.
 */
export const downloadImportTemplate = async () => {
  const response = await api.get('/students/import/template', {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'student-import-template.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Upload and validate a student spreadsheet (.csv, .xlsx, .xls) without saving to DB.
 * @param {File} file - The spreadsheet file to validate
 * @param {Function} onUploadProgress - Axios upload progress callback
 */
export const validateStudentImport = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/students/import/validate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};

/**
 * Commit validated student rows to database in a transactional batch.
 * @param {Array} rows - Array of validated student objects
 */
export const commitStudentImport = async (rows) => {
  const response = await api.post('/students/import/commit', { rows });
  return response.data;
};

/**
 * Set or reset custom monthly fee override for a student.
 * @param {string} id - Student ID
 * @param {Object} data - { customFee: number | null, customFeeNote: string | null }
 */
export const setStudentCustomFee = async (id, data) => {
  const response = await api.patch(`/students/${id}/custom-fee`, data);
  return response.data;
};

