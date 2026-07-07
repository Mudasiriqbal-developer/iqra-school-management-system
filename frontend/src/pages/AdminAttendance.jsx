import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Award, BookOpen, Wallet, CalendarCheck, BarChart3,
  Calendar, CheckCircle, XCircle, Clock, Info, RefreshCw, AlertCircle, Eye,
  TrendingUp, DollarSign, CalendarClock
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import { getClasses, getSectionsByClass, getSubjectsByClass } from '../features/academics/academicService';
import { getAttendanceByFilters } from '../features/attendance/adminAttendanceService';
import StudentAttendanceHistoryModal from '../features/attendance/StudentAttendanceHistoryModal';

const AdminAttendance = () => {
  // Navigation items for the Sidebar (Consistent navigation across Admin Suite)
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Expense Tracker', icon: TrendingUp, path: '/admin/expenses' },
    { label: 'Salary Payroll', icon: DollarSign, path: '/admin/payroll' },
    { label: 'Leave Approvals', icon: CalendarClock, path: '/admin/leaves' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  // Date defaults
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Cascading lists states
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);

  // Selected filters states
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(todayStr);

  // Data states
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingFilters(true);
        const res = await getClasses();
        // Backend academicService has standard returns (res or res.data depending on wrapper)
        // Let's verify response shape. The service file showed return response.data
        if (res.success) {
          setClassesList(res.data || []);
        } else {
          setClassesList(res || []);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        toast.error('Failed to load classes');
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchClasses();
  }, []);

  // 2. Fetch sections and subjects when classId changes
  useEffect(() => {
    const fetchSectionsAndSubjects = async () => {
      if (!classId) {
        setSectionsList([]);
        setSubjectsList([]);
        setSectionId('');
        setSubjectId('');
        return;
      }

      try {
        setLoadingFilters(true);
        const [sectionsRes, subjectsRes] = await Promise.all([
          getSectionsByClass(classId),
          getSubjectsByClass(classId)
        ]);

        if (sectionsRes.success) {
          const rawSections = sectionsRes.data || [];
          const filtered = rawSections.filter(sec => {
            const secClassId = sec.classId?._id || sec.classId;
            return secClassId === classId;
          });
          setSectionsList(filtered);
        } else {
          const rawSections = Array.isArray(sectionsRes) ? sectionsRes : [];
          const filtered = rawSections.filter(sec => {
            const secClassId = sec.classId?._id || sec.classId;
            return secClassId === classId;
          });
          setSectionsList(filtered);
        }

        if (subjectsRes.success) {
          const rawSubjects = subjectsRes.data || [];
          const filtered = rawSubjects.filter(sub => {
            const subClassId = sub.classId?._id || sub.classId;
            return subClassId === classId;
          });
          setSubjectsList(filtered);
        } else {
          const rawSubjects = Array.isArray(subjectsRes) ? subjectsRes : [];
          const filtered = rawSubjects.filter(sub => {
            const subClassId = sub.classId?._id || sub.classId;
            return subClassId === classId;
          });
          setSubjectsList(filtered);
        }

        // Reset sub-selections
        setSectionId('');
        setSubjectId('');
      } catch (err) {
        console.error('Error fetching sections/subjects:', err);
        toast.error('Failed to load sections or subjects');
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchSectionsAndSubjects();
  }, [classId]);

  // 3. Fetch attendance record based on selected class, section, subject, date
  const fetchAttendance = async () => {
    if (!classId || !sectionId || !subjectId || !date) {
      setAttendanceRecord(null);
      return;
    }

    try {
      setLoadingAttendance(true);
      setError(null);
      
      console.log('--- ADMIN ATTENDANCE DEBUG ---');
      console.log('Selected filters:', { classId, sectionId, subjectId, date });
      const expectedKey = `attendance_${classId}_${sectionId}_${subjectId}_${date}`;
      console.log('Expected key in localStorage:', expectedKey);
      console.log('Value in localStorage:', localStorage.getItem(expectedKey));
      console.log('All localStorage keys starting with "attendance_":', Object.keys(localStorage).filter(k => k.startsWith('attendance_')));
      console.log('------------------------------');

      const params = { classId, sectionId, subjectId, date };
      const res = await getAttendanceByFilters(params);
      
      if (res.success) {
        // GET /api/attendance returns array or single object
        const records = res.data;
        if (Array.isArray(records) && records.length > 0) {
          setAttendanceRecord(records[0]);
        } else if (records && !Array.isArray(records)) {
          setAttendanceRecord(records);
        } else {
          setAttendanceRecord(null);
        }
      } else {
        throw new Error(res.message || 'Failed to fetch attendance records.');
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
      setError(err.message || 'Error occurred while loading attendance records.');
      setAttendanceRecord(null);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Trigger fetch when any main filter updates
  useEffect(() => {
    fetchAttendance();
  }, [classId, sectionId, subjectId, date]);

  // Prevent selecting future date
  const handleDateChange = (e) => {
    const selected = e.target.value;
    if (selected > todayStr) {
      toast.error('Future attendance record cannot be viewed.');
      return;
    }
    setDate(selected);
  };

  // Roster attendance stats calculations
  const stats = useMemo(() => {
    if (!attendanceRecord || !attendanceRecord.records) {
      return { total: 0, present: 0, absent: 0, late: 0, leave: 0 };
    }

    const records = attendanceRecord.records;
    const total = records.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    records.forEach(r => {
      const status = r.status?.toLowerCase();
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'excused' || status === 'leave') leave++;
    });

    return { total, present, absent, late, leave };
  }, [attendanceRecord]);

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

  const handleOpenHistoryModal = (studentId, fullName, registrationNumber) => {
    setSelectedStudent({ _id: studentId, fullName, registrationNumber });
    setIsModalOpen(true);
  };

  // Convert status string to StatusBadge props
  const getStatusBadgeProps = (status) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case 'present':
        return { status: 'active', label: 'Present' };
      case 'absent':
        return { status: 'danger', label: 'Absent' };
      case 'late':
        return { status: 'pending', label: 'Late' };
      case 'excused':
      case 'leave':
        return { status: 'info', label: 'Leave' };
      default:
        return { status: 'default', label: status || 'Unknown' };
    }
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Mudasir Iqbal"
      userRole="Administrator"
      subtitle="Administrative Suite"
    >
      <div className="space-y-6 pb-24">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Attendance Records</h1>
          <p className="text-sm text-gray-500 mt-1">View daily attendance by class, section, and subject.</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Class Select */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Class
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 shadow-sm"
              disabled={loadingFilters}
            >
              <option value="">Select Class</option>
              {classesList.map(cls => (
                <option key={cls._id} value={cls._id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Section
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!classId || loadingFilters}
            >
              <option value="">Select Section</option>
              {sectionsList.map(sec => (
                <option key={sec._id} value={sec._id}>{sec.name}</option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!classId || loadingFilters}
            >
              <option value="">Select Subject</option>
              {subjectsList.map(sub => (
                <option key={sub._id} value={sub._id}>{sub.name}</option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={handleDateChange}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 shadow-sm"
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error loading page records</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content Render */}
        {loadingAttendance ? (
          <div className="py-24 text-center">
            <RefreshCw className="animate-spin h-10 w-10 text-navy-900 mx-auto" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4">
              Loading attendance data...
            </p>
          </div>
        ) : !classId || !sectionId || !subjectId ? (
          // Filters Incomplete Screen
          <div className="bg-white border border-gray-200/60 rounded-2xl p-16 text-center max-w-lg mx-auto shadow-sm">
            <Calendar className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-base font-bold text-navy-950">Select Filters</h3>
            <p className="mt-2 text-xs text-gray-500 max-w-xs mx-auto">
              Please choose a class, section, and subject above to load the registered student roster and view daily attendance.
            </p>
          </div>
        ) : !attendanceRecord ? (
          // Empty State Screen
          <div className="bg-white border border-gray-200/60 rounded-2xl p-16 text-center max-w-lg mx-auto shadow-sm">
            <CalendarCheck className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-base font-bold text-navy-950">No Records Found</h3>
            <p className="mt-2 text-xs text-gray-500 max-w-xs mx-auto">
              No attendance marked for this class/subject on this date yet.
            </p>
          </div>
        ) : (
          // Loaded Attendance State
          <div className="space-y-6">
            
            {/* Roster Attendance Summary Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={Users} label="Total Students" value={stats.total} />
              <StatCard 
                icon={CheckCircle} 
                label="Present" 
                value={stats.present} 
                trend={stats.total > 0 ? `${Math.round(stats.present / stats.total * 100)}%` : null}
                trendColor="info"
              />
              <StatCard 
                icon={XCircle} 
                label="Absent" 
                value={stats.absent} 
                trend={stats.total > 0 ? `${Math.round(stats.absent / stats.total * 100)}%` : null}
                trendColor="danger"
              />
              <StatCard 
                icon={Clock} 
                label="Late" 
                value={stats.late} 
                trend={stats.total > 0 ? `${Math.round(stats.late / stats.total * 100)}%` : null}
                trendColor="pending"
              />
              <StatCard 
                icon={Info} 
                label="Leave" 
                value={stats.leave} 
                trend={stats.total > 0 ? `${Math.round(stats.leave / stats.total * 100)}%` : null}
                trendColor="info"
              />
            </div>

            {/* Roster Table */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <div>
                  <h2 className="text-lg font-bold text-navy-950">
                    Roster Attendance Details
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Class: {attendanceRecord.classId?.name} | Section: {attendanceRecord.sectionId?.name} | Subject: {attendanceRecord.subjectId?.name}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                        Student Info
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Registration No
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                        Status
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceRecord.records.map((rec) => {
                      const studentId = rec.studentId?._id || rec.studentId;
                      const fullName = rec.studentId?.fullName || 'Unknown Student';
                      const registrationNumber = rec.studentId?.registrationNumber || 'N/A';
                      const avatar = getAvatarConfig(fullName);
                      const badgeProps = getStatusBadgeProps(rec.status);

                      return (
                        <tr 
                          key={rec._id} 
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          {/* Student Photo / Name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner ${avatar.bg}`}>
                                {avatar.initials}
                              </div>
                              <span className="font-bold text-navy-950 text-sm">
                                {fullName}
                              </span>
                            </div>
                          </td>

                          {/* Registration No */}
                          <td className="py-4 px-6 text-sm font-semibold text-gray-600">
                            {registrationNumber}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-6 text-center">
                            <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                          </td>

                          {/* Action Button */}
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleOpenHistoryModal(studentId, fullName, registrationNumber)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-navy-100 rounded-xl bg-navy-50/50 hover:bg-navy-100/60 text-navy-900 text-xs font-bold transition-all shadow-sm"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View History</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* marked by footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>
                  Marked by <span className="font-semibold text-navy-950">{attendanceRecord.teacherId?.userId?.name || 'Assigned Teacher'}</span>
                </span>
                <span>
                  Date: {attendanceRecord.date}
                </span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* History Modal */}
      <StudentAttendanceHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
      />
    </DashboardLayout>
  );
};

export default AdminAttendance;
