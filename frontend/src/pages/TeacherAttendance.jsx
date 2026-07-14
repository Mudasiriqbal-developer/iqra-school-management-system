import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Save,
  UserCheck,
  RefreshCw,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  getMyClassSection,
  getStudentsByClassSection,
  getExistingAttendance,
  submitAttendance,
} from '../features/attendance/attendanceService';
import { formatClassName } from '../utils/format';

const TeacherAttendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation items for Sidebar
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher-dashboard' },
    { label: 'Mark Attendance', icon: Calendar, path: '/teacher/attendance' },
    { label: 'Manage Grades', icon: Award, path: '/teacher/grades' }
  ];


  // Core States
  const [myClassSection, setMyClassSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState({}); // { studentId: status }
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Date parameter (defaults to today YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const activeDate = searchParams.get('date') || todayStr;

  // Load class section on mount
  useEffect(() => {
    const fetchClassSection = async () => {
      try {
        setIsPageLoading(true);
        setError(null);
        const res = await getMyClassSection();
        if (res.success) {
          setMyClassSection(res.data || null);
        } else {
          throw new Error(res.message || 'Failed to retrieve class details.');
        }
      } catch (err) {
        console.error('Error loading class section:', err);
        setError(err.message || 'Could not load class assignment. Please try again.');
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchClassSection();
  }, []);

  // Load student roster and existing attendance when assignment or date changes
  useEffect(() => {
    if (!myClassSection) return;

    const classId = myClassSection.classId?._id;
    const sectionId = myClassSection._id;

    const loadRosterAndAttendance = async () => {
      try {
        setIsStudentsLoading(true);
        setError(null);

        // Fetch students and existing attendance in parallel
        const [studentsRes, attendanceRes] = await Promise.all([
          getStudentsByClassSection(classId, sectionId),
          getExistingAttendance(classId, sectionId, activeDate),
        ]);

        let roster = [];
        if (studentsRes.success && studentsRes.data && studentsRes.data.students) {
          roster = studentsRes.data.students;
          setStudents(roster);
        } else {
          throw new Error(studentsRes.message || 'Failed to load students.');
        }

        // Prefill attendance statuses
        const statusMap = {};
        roster.forEach((student) => {
          statusMap[student._id] = null; // default to unmarked
        });

        if (attendanceRes.success && attendanceRes.data && attendanceRes.data.records) {
          attendanceRes.data.records.forEach((record) => {
            statusMap[record.studentId] = record.status;
          });
        }

        setAttendanceStatuses(statusMap);
      } catch (err) {
        console.error('Error loading roster/attendance:', err);
        setError(err.message || 'Error occurred while fetching student roster or attendance data.');
      } finally {
        setIsStudentsLoading(false);
      }
    };

    loadRosterAndAttendance();
  }, [myClassSection, activeDate]);

  // Calculate live statistics
  const stats = useMemo(() => {
    const total = students.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    students.forEach((student) => {
      const status = attendanceStatuses[student._id];
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'excused') excused++;
      else unmarked++;
    });

    return { total, present, absent, late, excused, unmarked };
  }, [students, attendanceStatuses]);

  // Event handlers
  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    // Prevent future dates
    if (selectedDate > todayStr) {
      toast.error('Future attendance cannot be marked.');
      return;
    }
    setSearchParams({
      date: selectedDate,
    });
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendanceStatuses };
    students.forEach((student) => {
      updated[student._id] = 'present';
    });
    setAttendanceStatuses(updated);
    toast.success('Marked all students as present');
  };

  const handleSaveAttendance = async () => {
    if (stats.unmarked > 0) {
      toast.error(`Please select a status for all students. ${stats.unmarked} unmarked remaining.`);
      return;
    }

    try {
      setIsSaving(true);
      const records = Object.entries(attendanceStatuses).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const payload = {
        classId: myClassSection.classId?._id,
        sectionId: myClassSection._id,
        date: activeDate,
        records,
      };

      const res = await submitAttendance(payload);
      if (res.success) {
        toast.success(`Attendance successfully saved for ${activeDate}!`);
      } else {
        throw new Error(res.message || 'Failed to submit attendance.');
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      toast.error(err.message || 'An error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar helper
  const getAvatarConfig = (name) => {
    const colors = [
      'bg-blue-600 text-blue-100',
      'bg-purple-600 text-purple-100',
      'bg-emerald-600 text-emerald-100',
      'bg-amber-600 text-amber-100',
      'bg-pink-600 text-pink-100',
      'bg-indigo-600 text-indigo-100',
    ];
    const cleanName = name || 'Student';
    const colorIndex = cleanName.length % colors.length;
    const initials = cleanName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return { bg: colors[colorIndex], initials };
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userName={user?.name}
      userRole={user?.role}
      subtitle="Teacher Portal"
    >
      <div className="space-y-8 pb-24">
        {/* Header Block */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/teacher-dashboard')}
              className="p-2 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-navy-950 hover:bg-gray-50 transition-colors focus:outline-none"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Mark Attendance</h1>
              <p className="text-sm text-gray-500 mt-1">
                Record attendance values for your assigned class rosters.
              </p>
            </div>
          </div>

          {/* Selector / Date Controls */}
          {!isPageLoading && myClassSection && (
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
              <div className="flex-grow flex items-center bg-gray-50 border border-gray-200/50 rounded-xl px-4 py-2 text-xs font-semibold text-navy-950 shadow-sm min-w-[200px]">
                <span className="text-gray-500 mr-2 font-bold uppercase tracking-wider text-[10px]">Homeroom:</span>
                {myClassSection.classId?.name} - {myClassSection.name}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={activeDate}
                  max={todayStr}
                  onChange={handleDateChange}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error loading page resources</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Shells */}
        {isPageLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200/60 h-32" />
            ))}
          </div>
        ) : !myClassSection ? (
          <div className="bg-white border border-gray-200/60 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-bold text-navy-950">Not Assigned as Class Teacher</h3>
            <p className="mt-2 text-sm text-gray-500">
              You are not assigned as a Class Teacher for any section. Please contact the administrator to assign you.
            </p>
          </div>
        ) : (
          <>
            {/* Live Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard icon={Users} label="Total Students" value={stats.total} />
              <StatCard
                icon={CheckCircle}
                label="Present"
                value={stats.present}
                trend={stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : null}
                trendColor="info"
              />
              <StatCard
                icon={XCircle}
                label="Absent"
                value={stats.absent}
                trend={stats.total > 0 ? `${Math.round((stats.absent / stats.total) * 100)}%` : null}
                trendColor="danger"
              />
            </div>

            {/* Roster & Table */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div>
                  <h2 className="text-lg font-bold text-navy-950">
                    Student Roster - {formatClassName(myClassSection.classId?.name)} (Section {myClassSection.name})
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Date: {activeDate}
                  </p>
                </div>
                {!isStudentsLoading && students.length > 0 && (
                  <button
                    onClick={handleMarkAllPresent}
                    className="bg-navy-50 text-navy-800 hover:bg-navy-100 border border-navy-100 font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 transition-colors text-xs"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Mark All Present</span>
                  </button>
                )}
              </div>

              {isStudentsLoading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="animate-spin h-8 w-8 text-navy-800 mx-auto" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">
                    Fetching class roster...
                  </p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-gray-500 font-medium">No students registered in this section.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Student Details
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Registration No
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                          Attendance Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((student) => {
                        const avatar = getAvatarConfig(student.fullName);
                        const currentStatus = attendanceStatuses[student._id];

                        return (
                          <tr key={student._id} className="hover:bg-gray-50/50 transition-colors">
                            {/* Student Details */}
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3.5">
                                {student.photoUrl ? (
                                  <img
                                    src={student.photoUrl}
                                    alt={student.fullName}
                                    className="h-10 w-10 rounded-xl object-cover border border-gray-100 shadow-sm"
                                  />
                                ) : (
                                  <div
                                    className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-sm ${avatar.bg}`}
                                  >
                                    {avatar.initials}
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-bold text-navy-950">
                                    {student.fullName}
                                  </div>
                                  <div className="text-xs text-gray-400 capitalize">
                                    {student.gender}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Registration Number */}
                            <td className="py-4 px-6 text-sm font-semibold text-gray-600">
                              {student.registrationNumber}
                            </td>

                            {/* Attendance Toggle Buttons */}
                            <td className="py-4 px-6">
                              <div className="flex justify-center items-center">
                                <div className="inline-flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/40 space-x-1 shadow-sm">
                                  {/* Present Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(student._id, 'present')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      currentStatus === 'present'
                                        ? 'bg-green-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    Present
                                  </button>

                                  {/* Absent Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(student._id, 'absent')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      currentStatus === 'absent'
                                        ? 'bg-red-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sticky Bottom Bar */}
            {!isStudentsLoading && students.length > 0 && (
              <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200/80 p-4 flex items-center justify-between z-10 shadow-lg px-8">
                <div className="flex items-center space-x-2">
                  {stats.unmarked > 0 ? (
                    <>
                      <AlertCircle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                      <span className="text-xs font-semibold text-gray-500">
                        {stats.unmarked} of {stats.total} students unmarked.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4.5 w-4.5 text-green-600" />
                      <span className="text-xs font-bold text-green-700">
                        All rosters marked and ready.
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/teacher-dashboard')}
                    className="px-4 py-2 border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAttendance}
                    disabled={isSaving || stats.unmarked > 0}
                    className={`px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-md transition-colors text-sm ${
                      stats.unmarked > 0
                        ? 'bg-gray-250 text-gray-400 border border-gray-200/30 cursor-not-allowed shadow-none'
                        : isSaving
                        ? 'bg-navy-800 text-gray-200 cursor-not-allowed shadow-none'
                        : 'bg-navy-900 text-white hover:bg-navy-800 shadow-navy-900/10'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Attendance</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendance;
