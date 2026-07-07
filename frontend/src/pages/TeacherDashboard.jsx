import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  Grid,
  CalendarCheck,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CalendarDays
} from 'lucide-react';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import { useAuth } from '../context/AuthContext';
import { getMyAssignments } from '../features/attendance/attendanceService';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Navigation items for the Sidebar
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher-dashboard' },
    { label: 'Mark Attendance', icon: Calendar, path: '/teacher/attendance' },
    { label: 'My Leaves', icon: CalendarDays, path: '/teacher/leaves' }
  ];

  // Component States
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load teacher assignments on mount
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getMyAssignments();
        if (res.success) {
          setAssignments(res.data || []);
        } else {
          throw new Error(res.message || 'Failed to retrieve assignments.');
        }
      } catch (err) {
        console.error('Error fetching teacher assignments:', err);
        setError(err.message || 'Could not load your assigned classes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Compute dynamic stats
  const dynamicStats = useMemo(() => {
    const totalClasses = assignments.length;

    // Get unique subjects
    const uniqueSubjects = new Set(
      assignments.map((asg) => asg.subjectId?._id).filter(Boolean)
    ).size;

    // Get unique sections
    const uniqueSections = new Set(
      assignments.map((asg) => asg.sectionId?._id).filter(Boolean)
    ).size;

    // Formatted date string
    const today = new Date();
    const formattedDate = today.toLocaleDateString('default', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return { totalClasses, uniqueSubjects, uniqueSections, formattedDate };
  }, [assignments]);

  // Navigate to mark attendance screen
  const handleMarkAttendance = (asg) => {
    navigate(
      `/teacher/attendance?classId=${asg.classId._id}&sectionId=${asg.sectionId._id}&subjectId=${asg.subjectId._id}`
    );
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userName={user?.name}
      userRole={user?.role}
      subtitle="Teacher Portal"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Faculty Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review your assigned classes, mark student attendance, and track classroom statistics.
            </p>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error loading dashboard resources</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200/60 h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={BookOpen} label="Assigned Classes" value={dynamicStats.totalClasses} />
            <StatCard icon={Grid} label="Assigned Subjects" value={dynamicStats.uniqueSubjects} />
            <StatCard icon={Users} label="Class Sections" value={dynamicStats.uniqueSections} />
            <StatCard icon={CalendarCheck} label="Today's Date" value={dynamicStats.formattedDate} />
          </div>
        )}

        {/* My Classes Table / List */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">My Classes & Rosters</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                List of your assigned classes, sections, and subjects. Select a row to mark attendance.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin h-8 w-8 text-navy-800 mx-auto" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">
                Fetching assigned classes...
              </p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-base font-bold text-navy-950">No Classes Assigned</h3>
              <p className="mt-2 text-xs text-gray-500">
                You have no assigned classes yet. Please contact your admin to map classes to your profile.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Class Name
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignments.map((asg) => (
                    <tr key={asg._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-bold text-navy-950">
                        {asg.classId.name}
                      </td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-600">
                        {asg.sectionId.name}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                        {asg.subjectId.name}
                      </td>
                      <td className="py-4 px-6 text-sm text-right">
                        <button
                          onClick={() => handleMarkAttendance(asg)}
                          className="bg-navy-900 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 hover:bg-navy-800 transition-colors shadow-sm text-xs ml-auto"
                        >
                          <span>Mark Attendance</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
