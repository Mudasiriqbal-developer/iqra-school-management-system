import api from '../../services/api';

/**
 * Fetch all teachers with populated User profiles.
 */
export const getTeachers = async () => {
  const response = await api.get('/teachers');
  return response.data;
};

/**
 * Fetch a single teacher by ID.
 * @param {string} id - Teacher MongoDB ID
 */
export const getTeacherById = async (id) => {
  const response = await api.get(`/teachers/${id}`);
  return response.data;
};

/**
 * Create a new teacher and user login.
 * @param {Object} data - Teacher details (name, email, password, employeeId, qualification, phone, joiningDate, photoUrl)
 */
export const createTeacher = async (data) => {
  const response = await api.post('/teachers', data);
  return response.data;
};

/**
 * Update an existing teacher profile and user record.
 * @param {string} id - Teacher MongoDB ID
 * @param {Object} data - Update payload
 */
export const updateTeacher = async (id, data) => {
  const response = await api.put(`/teachers/${id}`, data);
  return response.data;
};

/**
 * Soft delete a teacher by deactivating their User login.
 * @param {string} id - Teacher MongoDB ID
 */
export const deleteTeacher = async (id) => {
  const response = await api.delete(`/teachers/${id}`);
  return response.data;
};

/**
 * Fetch all assignments for a specific teacher.
 * Filters assignments client-side from the complete assignments list.
 * @param {string} teacherId - Teacher MongoDB ID
 */
export const getAssignmentsByTeacher = async (teacherId) => {
  const response = await api.get('/assignments');
  if (response.data?.success) {
    const filtered = response.data.data.filter(
      (asg) => asg.teacherId?._id === teacherId
    );
    return { success: true, data: filtered };
  }
  return response.data;
};

/**
 * Create a new class/section/subject assignment for a teacher.
 * @param {Object} data - { teacherId, classId, sectionId, subjectId }
 */
export const createAssignment = async (data) => {
  const response = await api.post('/assignments', data);
  return response.data;
};

/**
 * Delete a teacher assignment by ID.
 * @param {string} id - Assignment MongoDB ID
 */
export const deleteAssignment = async (id) => {
  const response = await api.delete(`/assignments/${id}`);
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
 * Fetch sections filtered by classId client-side.
 * @param {string} classId - Class MongoDB ID
 */
export const getSectionsByClass = async (classId) => {
  const response = await api.get('/sections');
  if (response.data?.success) {
    const filtered = response.data.data.filter(
      (sec) => (sec.classId?._id || sec.classId) === classId
    );
    return { success: true, data: filtered };
  }
  return response.data;
};

/**
 * Fetch subjects filtered by classId client-side.
 * @param {string} classId - Class MongoDB ID
 */
export const getSubjectsByClass = async (classId) => {
  const response = await api.get('/subjects');
  if (response.data?.success) {
    const filtered = response.data.data.filter(
      (sub) => (sub.classId?._id || sub.classId) === classId
    );
    return { success: true, data: filtered };
  }
  return response.data;
};
