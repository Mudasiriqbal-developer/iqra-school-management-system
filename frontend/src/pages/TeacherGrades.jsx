import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Award,
  CalendarDays,
  Users,
  Save,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Percent,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import { useAuth } from '../context/AuthContext';
import { getMyAssignments, getStudentsByClassSection } from '../features/attendance/attendanceService';
import api from '../services/api';
import { formatClassName } from '../utils/format';

const TeacherGrades = () => {
  const { user } = useAuth();

  // Sidebar items
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher-dashboard' },
    { label: 'Mark Attendance', icon: Calendar, path: '/teacher/attendance' },
    { label: 'Manage Grades', icon: Award, path: '/teacher/grades' }
  ];

  // Core States
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentIndex, setSelectedAssignmentIndex] = useState('');
  const [examType, setExamType] = useState('quiz');
  
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({}); // { studentId: { marksObtained, totalMarks, comments } }
  
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load teacher assignments on mount
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsPageLoading(true);
        setError(null);
        const res = await getMyAssignments();
        if (res.success) {
          setAssignments(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedAssignmentIndex(0); // select first by default
          }
        } else {
          throw new Error(res.message || 'Failed to retrieve teaching assignments.');
        }
      } catch (err) {
        console.error('Error loading teaching assignments:', err);
        setError(err.message || 'Could not load teaching assignments. Please try again.');
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Selected assignment detail
  const activeAssignment = useMemo(() => {
    if (selectedAssignmentIndex === '' || !assignments[selectedAssignmentIndex]) {
      return null;
    }
    return assignments[selectedAssignmentIndex];
  }, [assignments, selectedAssignmentIndex]);

  // Load student roster and existing grades when assignment or exam type changes
  useEffect(() => {
    if (!activeAssignment) return;

    const classId = activeAssignment.classId?._id;
    const sectionId = activeAssignment.sectionId?._id;
    const subjectId = activeAssignment.subjectId?._id;

    const loadRosterAndGrades = async () => {
      try {
        setIsStudentsLoading(true);
        setError(null);

        // 1. Fetch students in this class section
        const studentsRes = await getStudentsByClassSection(classId, sectionId);
        let roster = [];
        if (studentsRes.success && studentsRes.data && studentsRes.data.students) {
          roster = studentsRes.data.students;
          setStudents(roster);
        } else {
          throw new Error(studentsRes.message || 'Failed to load student roster.');
        }

        // 2. Fetch existing grades for this combination
        const gradesRes = await api.get('/grades/class-section', {
          params: { classId, sectionId, subjectId, examType },
        });

        // Initialize mapping
        const initialMarks = {};
        roster.forEach((student) => {
          initialMarks[student._id] = {
            marksObtained: '',
            totalMarks: '100', // default total marks
            comments: '',
          };
        });

        if (gradesRes.data.success && gradesRes.data.data) {
          gradesRes.data.data.forEach((gradeRecord) => {
            const sId = gradeRecord.studentId?._id || gradeRecord.studentId;
            if (initialMarks[sId]) {
              initialMarks[sId] = {
                marksObtained: gradeRecord.marksObtained.toString(),
                totalMarks: gradeRecord.totalMarks.toString(),
                comments: gradeRecord.comments || '',
              };
            }
          });
        }

        setMarksData(initialMarks);
      } catch (err) {
        console.error('Error loading roster/grades:', err);
        setError(err.message || 'Error occurred while fetching students or grade records.');
      } finally {
        setIsStudentsLoading(false);
      }
    };

    loadRosterAndGrades();
  }, [activeAssignment, examType]);

  // Handle individual grade updates
  const handleGradeChange = (studentId, field, value) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  // Bulk input for total marks
  const handleBulkTotalMarks = (val) => {
    if (!val || isNaN(val)) return;
    setMarksData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((sId) => {
        updated[sId].totalMarks = val;
      });
      return updated;
    });
  };

  // Submit grades
  const handleSubmitGrades = async (e) => {
    e.preventDefault();
    if (!activeAssignment) return;

    const classId = activeAssignment.classId?._id;
    const sectionId = activeAssignment.sectionId?._id;
    const subjectId = activeAssignment.subjectId?._id;

    // Validate grades input
    const gradesArray = [];
    let validationError = null;

    students.forEach((student) => {
      const record = marksData[student._id];
      if (record.marksObtained !== '') {
        const obtained = parseFloat(record.marksObtained);
        const total = parseFloat(record.totalMarks);

        if (isNaN(obtained) || obtained < 0) {
          validationError = `Marks for ${student.fullName} must be a valid positive number.`;
        }
        if (isNaN(total) || total <= 0) {
          validationError = `Total marks for ${student.fullName} must be greater than 0.`;
        }
        if (obtained > total) {
          validationError = `Marks obtained for ${student.fullName} cannot exceed total marks.`;
        }

        gradesArray.push({
          studentId: student._id,
          marksObtained: obtained,
          totalMarks: total,
          comments: record.comments,
        });
      }
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (gradesArray.length === 0) {
      toast.error('No grades entered. Please fill in marks for at least one student.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.post('/grades', {
        classId,
        sectionId,
        subjectId,
        examType,
        grades: gradesArray,
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Grades saved successfully!');
      } else {
        toast.error(response.data.message || 'Failed to save grades.');
      }
    } catch (err) {
      console.error('Error submitting grades:', err);
      toast.error(err.response?.data?.message || 'Error occurred while saving grades.');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute live statistics for statistics cards
  const stats = useMemo(() => {
    let totalRoster = students.length;
    let gradedCount = 0;
    let sumPercentage = 0;
    let highestPct = 0;

    students.forEach((s) => {
      const record = marksData[s._id];
      if (record && record.marksObtained !== '' && record.totalMarks) {
        const obtained = parseFloat(record.marksObtained);
        const total = parseFloat(record.totalMarks);
        if (!isNaN(obtained) && !isNaN(total) && total > 0) {
          gradedCount++;
          const pct = (obtained / total) * 100;
          sumPercentage += pct;
          if (pct > highestPct) {
            highestPct = pct;
          }
        }
      }
    });

    const averagePct = gradedCount > 0 ? Math.round(sumPercentage / gradedCount) : 0;
    const topPct = Math.round(highestPct);

    return {
      totalRoster,
      gradedCount,
      averagePct,
      topPct,
    };
  }, [students, marksData]);

  if (isPageLoading) {
    return (
      <DashboardLayout navItems={navItems} userName={user?.name} userRole={user?.role} subtitle="Teacher Portal">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="animate-spin h-10 w-10 text-navy-900" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} userName={user?.name} userRole={user?.role} subtitle="Teacher Portal">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Manage Grades & Marks</h1>
          <p className="text-sm text-gray-500 mt-1">Record and edit student marks for quizzes, assignments, and school exams.</p>
        </div>

        {/* Selected parameters bar */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Teaching Assignment</label>
              <select
                value={selectedAssignmentIndex}
                onChange={(e) => setSelectedAssignmentIndex(e.target.value)}
                className="w-full bg-gray-50 rounded-xl border border-gray-200 p-3 text-sm text-navy-950 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all"
              >
                {assignments.map((asg, idx) => (
                  <option key={asg._id} value={idx}>
                    {formatClassName(asg.classId?.name)} - {asg.sectionId?.name} | {asg.subjectId?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Exam / Assessment Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full bg-gray-50 rounded-xl border border-gray-200 p-3 text-sm text-navy-950 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all"
              >
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="midterm">Midterm Exam</option>
                <option value="final">Final Exam</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Bulk Total Marks"
              className="bg-gray-50 w-32 rounded-xl border border-gray-200 p-3 text-sm text-navy-950 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all"
              onBlur={(e) => handleBulkTotalMarks(e.target.value)}
            />
            <span className="text-xs text-gray-400 font-medium">Set Bulk Total</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Roster Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Total Students" value={stats.totalRoster} />
          <StatCard icon={FileCheck} label="Graded Students" value={`${stats.gradedCount} / ${stats.totalRoster}`} />
          <StatCard icon={Percent} label="Class Average" value={stats.gradedCount > 0 ? `${stats.averagePct}%` : 'N/A'} />
          <StatCard icon={TrendingUp} label="Class Top Score" value={stats.gradedCount > 0 ? `${stats.topPct}%` : 'N/A'} />
        </div>

        {/* Grading Form & Table */}
        <form onSubmit={handleSubmitGrades} className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Student Roster</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enter scores and remarks below. Leave empty if a student did not take the test.</p>
            </div>
            {activeAssignment && (
              <button
                type="submit"
                disabled={isSaving || isStudentsLoading}
                className="bg-navy-900 text-white font-bold py-2.5 px-5 rounded-xl flex items-center space-x-2 hover:bg-navy-800 transition-colors shadow-sm disabled:opacity-50 text-sm"
              >
                {isSaving ? (
                  <RefreshCw className="animate-spin h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Grades'}</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {isStudentsLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="animate-spin h-8 w-8 text-navy-800 mx-auto" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">Loading student roster...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center max-w-md mx-auto">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-4 text-sm font-bold text-navy-950">No Students Found</h3>
                <p className="mt-2 text-xs text-gray-500">There are no students registered in this class section.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/30 border-b border-gray-100">
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Student Info</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Obtained Marks</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Total Marks</th>
                    <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-5/12">Comments / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => {
                    const record = marksData[student._id] || { marksObtained: '', totalMarks: '100', comments: '' };
                    return (
                      <tr key={student._id} className="hover:bg-gray-50/20 transition-colors">
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-navy-950">{student.fullName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{student.registrationNumber}</p>
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={record.marksObtained}
                            placeholder="0"
                            onChange={(e) => handleGradeChange(student._id, 'marksObtained', e.target.value)}
                            className="w-full bg-gray-50 rounded-xl border border-gray-200 p-2.5 text-sm text-navy-950 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            min="1"
                            value={record.totalMarks}
                            placeholder="100"
                            onChange={(e) => handleGradeChange(student._id, 'totalMarks', e.target.value)}
                            className="w-full bg-gray-50 rounded-xl border border-gray-200 p-2.5 text-sm text-navy-950 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="text"
                            value={record.comments}
                            placeholder="e.g. Excellent progress, needs improvement in homework"
                            onChange={(e) => handleGradeChange(student._id, 'comments', e.target.value)}
                            className="w-full bg-gray-50 rounded-xl border border-gray-200 p-2.5 text-sm text-navy-950 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default TeacherGrades;
