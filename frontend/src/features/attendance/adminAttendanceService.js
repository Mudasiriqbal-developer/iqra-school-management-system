import api from '../../services/api';

/**
 * Fetch daily or range attendance records for admin view.
 * GET /api/attendance?classId=&sectionId=&subjectId=&date=
 * Falls back to LocalStorage mock if backend fails/404s.
 */
export const getAttendanceByFilters = async (params) => {
  try {
    const response = await api.get('/attendance', { params });
    return response.data;
  } catch (error) {
    console.warn('Backend /api/attendance endpoint not found or failed. Using LocalStorage fallback.');
    
    const { classId, sectionId, date } = params;
    if (!classId || !sectionId || !date) {
      return { success: true, data: [] };
    }

    const key = `attendance_${classId}_${sectionId}_${date}`;
    const localData = localStorage.getItem(key);
    if (!localData) {
      console.warn(`LocalStorage fallback: key "${key}" not found in localStorage.`);
      return { success: true, data: [] };
    }

    try {
      const mockRecord = JSON.parse(localData);

      // Fetch student roster, class, and section info in parallel to build populated shape
      const [studentsRes, classesRes, sectionsRes] = await Promise.allSettled([
        api.get('/students', { params: { classId, sectionId, limit: 200 } }),
        api.get('/classes'),
        api.get('/sections', { params: { classId } }),
      ]);

      // Resolve names
      let className = 'Class';
      if (classesRes.status === 'fulfilled' && classesRes.value.data?.success) {
        const cls = classesRes.value.data.data.find(c => c._id === classId);
        if (cls) className = cls.name;
      }

      let sectionName = 'Section';
      if (sectionsRes.status === 'fulfilled' && sectionsRes.value.data?.success) {
        const sec = sectionsRes.value.data.data.find(s => s._id === sectionId);
        if (sec) sectionName = sec.name;
      }

      // Map records to include student details
      let studentsList = [];
      if (studentsRes.status === 'fulfilled' && studentsRes.value.data?.success) {
        studentsList = studentsRes.value.data.data.students || [];
      }

      const populatedRecords = mockRecord.records.map(rec => {
        const studentInfo = studentsList.find(s => s._id === rec.studentId);
        return {
          _id: rec._id || `record_${Math.random()}`,
          status: rec.status,
          studentId: {
            _id: rec.studentId,
            fullName: studentInfo ? studentInfo.fullName : 'Unknown Student',
            registrationNumber: studentInfo ? studentInfo.registrationNumber : 'N/A'
          }
        };
      });

      return {
        success: true,
        data: [{
          _id: mockRecord._id,
          classId: { _id: classId, name: className },
          sectionId: { _id: sectionId, name: sectionName },
          teacherId: { userId: { name: 'Teacher (Mock)' } },
          date: mockRecord.date,
          records: populatedRecords,
          createdAt: mockRecord.createdAt,
          updatedAt: mockRecord.updatedAt
        }],
        message: 'Attendance retrieved from LocalStorage (fallback)'
      };
    } catch (e) {
      console.error('Error parsing or resolving LocalStorage mock:', e);
      return { success: false, data: [], message: 'Error retrieving local mock data' };
    }
  }
};

/**
 * Fetch attendance summary for a student over a date range.
 * GET /api/attendance/summary/:studentId?startDate=&endDate=
 * Falls back to LocalStorage mock scanning if backend fails/404s.
 */
export const getStudentAttendanceSummary = async (studentId, startDate, endDate) => {
  try {
    const response = await api.get(`/attendance/summary/${studentId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.warn('Backend /api/attendance/summary endpoint not found or failed. Scanning LocalStorage.');

    let totalDays = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_')) {
        try {
          const mockRecord = JSON.parse(localStorage.getItem(key));
          if (mockRecord && mockRecord.date) {
            const recordDate = new Date(mockRecord.date);
            
            // Check if record is within range
            let inRange = true;
            if (start && recordDate < start) inRange = false;
            if (end && recordDate > end) inRange = false;

            if (inRange && mockRecord.records) {
              const studentRec = mockRecord.records.find(r => r.studentId === studentId);
              if (studentRec) {
                totalDays++;
                const status = studentRec.status;
                if (status === 'present') presentCount++;
                else if (status === 'absent') absentCount++;
                else if (status === 'late') lateCount++;
                else if (status === 'excused' || status === 'leave') leaveCount++;
              }
            }
          }
        } catch (e) {
          console.error('Error reading key from localStorage in summary:', key, e);
        }
      }
    }

    const attendancePercentage = totalDays > 0 
      ? Math.round(((presentCount + lateCount) / totalDays) * 100) 
      : 0;

    return {
      success: true,
      data: {
        totalDays,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        attendancePercentage
      },
      message: 'Summary calculated from LocalStorage (fallback)'
    };
  }
};
