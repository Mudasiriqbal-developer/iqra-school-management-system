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
  CalendarDays,
  Award
} from 'lucide-react';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import { useAuth } from '../context/AuthContext';
import { getMyAssignments, getMyClassSection } from '../features/attendance/attendanceService';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Navigation items for the Sidebar
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher-dashboard' },
    { label: 'Mark Attendance', icon: Calendar, path: '/teacher/attendance' },
    { label: 'Manage Grades', icon: Award, path: '/teacher/grades' },
    { label: 'My Leaves', icon: CalendarDays, path: '/teacher/leaves' }
  ];


  // Component States
  const [assignments, setAssignments] = useState([]);
  const [myClassSection, setMyClassSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load teacher assignments & class teacher homeroom on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [asgRes, myClassRes] = await Promise.all([
          getMyAssignments(),
          getMyClassSection()
        ]);

        if (asgRes.success) {
          setAssignments(asgRes.data || []);
        } else {
          throw new Error(asgRes.message || 'Failed to retrieve assignments.');
        }

        if (myClassRes.success) {
          setMyClassSection(myClassRes.data);
        } else {
          throw new Error(myClassRes.message || 'Failed to retrieve homeroom class.');
        }
      } catch (err) {
        console.error('Error fetching teacher dashboard data:', err);
        setError(err.message || 'Could not load dashboard resources. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
  const handleMarkAttendance = () => {
    navigate('/teacher/attendance');
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

        {/* Class Teacher Section & Subjects You Teach */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Homeroom Assignment Card */}
          <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Homeroom Assignment</span>
              {loading ? (
                <div className="py-8 text-center animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              ) : !myClassSection ? (
                <div className="mt-4 flex flex-col items-center text-center space-y-2">
                  <AlertCircle className="h-10 w-10 text-amber-500" />
                  <p className="text-sm font-bold text-navy-950">No Homeroom Class</p>
                  <p className="text-xs text-gray-500">
                    You are not currently assigned as a Class Teacher. Contact your admin if you believe this is incorrect.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <h3 className="text-xl font-black text-navy-950">
                    {myClassSection.classId?.name} - {myClassSection.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    You are the designated Class Teacher for this homeroom section.
                  </p>
                </div>
              )}
            </div>
            
            {!loading && myClassSection && (
              <button
                onClick={handleMarkAttendance}
                className="mt-6 w-full bg-navy-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-navy-800 transition-colors shadow-sm text-sm"
              >
                <span>Mark Attendance</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Subjects You Teach (Informational) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-navy-950">Subjects You Teach</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  An overview of the classes, sections, and subjects mapped to your account.
                </p>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="animate-spin h-8 w-8 text-navy-800 mx-auto" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">
                    Fetching teaching assignments...
                  </p>
                </div>
              ) : assignments.length === 0 ? (
                <div className="p-12 text-center max-w-md mx-auto">
                  <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                  <h3 className="mt-4 text-sm font-bold text-navy-950">No Subjects Assigned</h3>
                  <p className="mt-2 text-xs text-gray-500">
                    You are not assigned to teach any subjects.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Class Name
                        </th>
                        <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Section
                        </th>
                        <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assignments.map((asg) => (
                        <tr key={asg._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-6 text-sm font-bold text-navy-950">
                            {asg.classId?.name}
                          </td>
                          <td className="py-3.5 px-6 text-sm font-semibold text-gray-600">
                            {asg.sectionId?.name}
                          </td>
                          <td className="py-3.5 px-6 text-sm text-gray-600 font-medium">
                            {asg.subjectId?.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
