import api from '../../services/api';

/**
 * Classes API Calls
 */
export const getClasses = async () => {
  const response = await api.get('/classes');
  return response.data;
};

export const createClass = async (data) => {
  const response = await api.post('/classes', data);
  return response.data;
};

export const updateClass = async (id, data) => {
  const response = await api.put(`/classes/${id}`, data);
  return response.data;
};

export const deleteClass = async (id) => {
  const response = await api.delete(`/classes/${id}`);
  return response.data;
};

/**
 * Sections API Calls
 */
export const getSectionsByClass = async (classId) => {
  const response = await api.get('/sections', { params: { classId } });
  return response.data;
};

export const createSection = async (data) => {
  const response = await api.post('/sections', data);
  return response.data;
};

export const updateSection = async (id, data) => {
  const response = await api.put(`/sections/${id}`, data);
  return response.data;
};

export const deleteSection = async (id) => {
  const response = await api.delete(`/sections/${id}`);
  return response.data;
};

/**
 * Subjects API Calls
 */
export const getSubjectsByClass = async (classId) => {
  const response = await api.get('/subjects', { params: { classId } });
  return response.data;
};

export const createSubject = async (data) => {
  const response = await api.post('/subjects', data);
  return response.data;
};

export const updateSubject = async (id, data) => {
  const response = await api.put(`/subjects/${id}`, data);
  return response.data;
};

export const deleteSubject = async (id) => {
  const response = await api.delete(`/subjects/${id}`);
  return response.data;
};

/**
 * Class Teacher API Calls
 */
export const assignClassTeacher = async (sectionId, teacherId) => {
  const response = await api.put(`/sections/${sectionId}/class-teacher`, { teacherId });
  return response.data;
};

export const unassignClassTeacher = async (sectionId) => {
  const response = await api.delete(`/sections/${sectionId}/class-teacher`);
  return response.data;
};

