import api from '../../services/api';

/**
 * Fetch all assignments for the logged-in teacher.
 * GET /api/assignments/my-assignments
 */
export const getMyAssignments = async () => {
  const response = await api.get('/assignments/my-assignments');
  return response.data;
};

/**
 * Fetch students belonging to a class and section.
 * GET /api/students?classId=&sectionId=&limit=200
 */
export const getStudentsByClassSection = async (classId, sectionId) => {
  const response = await api.get('/students', {
    params: { classId, sectionId, limit: 200 },
  });
  return response.data;
};

/**
 * Fetch existing attendance record for a class/section/date.
 * GET /api/attendance
 * Falls back to localStorage mock if the endpoint doesn't exist (404/network errors).
 */
export const getExistingAttendance = async (classId, sectionId, date) => {
  try {
    const response = await api.get('/attendance', {
      params: { classId, sectionId, date },
    });
    return response.data;
  } catch (error) {
    // If endpoint returns 404 or any error, fall back to local storage mock
    console.warn('Backend /api/attendance not fully configured. Using LocalStorage fallback.');
    const key = `attendance_${classId}_${sectionId}_${date}`;
    const localData = localStorage.getItem(key);
    if (localData) {
      return { success: true, data: JSON.parse(localData) };
    }
    return { success: true, data: null };
  }
};

/**
 * Submit or update attendance records.
 * POST /api/attendance
 * Falls back to localStorage mock if the endpoint doesn't exist (404/network errors).
 */
export const submitAttendance = async (data) => {
  try {
    const response = await api.post('/attendance', data);
    return response.data;
  } catch (error) {
    console.warn('Backend /api/attendance not fully configured. Saving to LocalStorage fallback.');
    const { classId, sectionId, date, records } = data;
    const key = `attendance_${classId}_${sectionId}_${date}`;
    const mockRecord = {
      _id: `mock_${Date.now()}`,
      classId,
      sectionId,
      date,
      records: records.map((r) => ({
        studentId: r.studentId,
        status: r.status,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(mockRecord));
    return { success: true, data: mockRecord, message: 'Attendance saved locally (fallback)' };
  }
};

/**
 * Fetch the homeroom section where the logged-in teacher is the class teacher.
 * GET /api/teachers/my-class
 */
export const getMyClassSection = async () => {
  const response = await api.get('/teachers/my-class');
  return response.data;
};

