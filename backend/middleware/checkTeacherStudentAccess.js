const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');

/**
 * Shared helper function to verify if a teacher (by userId) has access to a student's class and section,
 * or is assigned to a specific class, section, and optional subject.
 * 
 * @param {string} userId - User ID of the teacher.
 * @param {string} classId - Class ID.
 * @param {string} sectionId - Section ID.
 * @param {string} [subjectId] - Optional Subject ID.
 * @returns {Promise<{ hasAccess: boolean, teacher: Object|null, assignment: Object|null }>}
 */
const checkTeacherStudentAccess = async (userId, classId, sectionId, subjectId = null) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    return { hasAccess: false, teacher: null, assignment: null };
  }

  const query = {
    teacherId: teacher._id,
    classId,
    sectionId,
  };

  if (subjectId) {
    query.subjectId = subjectId;
  }

  const assignment = await Assignment.findOne(query);
  if (!assignment) {
    return { hasAccess: false, teacher, assignment: null };
  }

  return { hasAccess: true, teacher, assignment };
};

module.exports = checkTeacherStudentAccess;
