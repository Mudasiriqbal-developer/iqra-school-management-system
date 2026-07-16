import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, Award, CreditCard, ArrowRight, Settings, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [grades, setGrades] = useState([]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard' },
    { label: 'My Schedule', icon: Calendar, path: '/student/schedule' },
    { label: 'Grades', icon: Award, path: '/student/grades' },
    { label: 'Fees', icon: CreditCard, path: '/student/fees' },
    { label: 'Settings', icon: Settings, path: '/student/settings' },
  ];

  const upcomingAssessments = [
    { id: 'ASM201', subject: 'Mathematics', type: 'Quiz 5 (Geometry)', date: 'Today, 11:30 AM', status: 'pending', label: 'Not Started' },
    { id: 'ASM202', subject: 'Physics', type: 'Lab Report 2 Submission', date: 'July 05, 2026', status: 'info', label: 'Draft Saved' },
    { id: 'ASM203', subject: 'English Literature', type: 'Book Review Presentation', date: 'July 08, 2026', status: 'active', label: 'Prepared' },
    { id: 'ASM204', subject: 'Chemistry', type: 'Monthly Unit Test', date: 'July 10, 2026', status: 'pending', label: 'Not Started' },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [profileRes, attendanceRes, gradesRes] = await Promise.all([
          api.get('/students/me/profile'),
          api.get('/students/me/attendance').catch(err => {
            console.error('Attendance error:', err);
            return { data: { success: false } };
          }),
          api.get('/grades/me').catch(err => {
            console.error('Grades error:', err);
            return { data: { success: false } };
          })
        ]);

        if (profileRes.data.success) {
          setProfile(profileRes.data.data.student);
        }
        if (attendanceRes.data.success) {
          setAttendance(attendanceRes.data.data.summary);
        }
        if (gradesRes.data.success) {
          setGrades(gradesRes.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching student dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const overallPercentage = useMemo(() => {
    if (grades.length === 0) return 'N/A';
    let totalObtained = 0;
    let totalMax = 0;
    grades.forEach((g) => {
      totalObtained += g.marksObtained || 0;
      totalMax += g.totalMarks || 0;
    });
    return totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
  }, [grades]);

  if (loading) {
    return (
      <DashboardLayout
        navItems={navItems}
        userName={user?.name || 'Student'}
        userRole="Student"
        subtitle="Student Portal"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  const studentName = profile?.fullName || user?.name || 'Student';
  const className = profile?.classId?.name || '';
  const sectionName = profile?.sectionId?.name || '';
  const displayRole = `Student (${className}${sectionName ? `-${sectionName}` : ''})`;

  return (
    <DashboardLayout
      navItems={navItems}
      userName={studentName}
      userRole={displayRole}
      subtitle="Student Portal"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Student Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Check grades, attend classes, manage fees, and complete assessments.</p>
          </div>
        </div>

        {/* 3 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            icon={Award}
            label="Overall Percentage"
            value={overallPercentage !== 'N/A' ? `${overallPercentage}%` : 'N/A'}
            trend="Academic Performance"
            trendColor={overallPercentage !== 'N/A' && parseFloat(overallPercentage) >= 60 ? 'active' : 'pending'}
          />

          <StatCard
            icon={Calendar}
            label="Attendance Rate"
            value={attendance ? `${attendance.attendanceRate}%` : '0%'}
            trend={attendance ? `${attendance.absentDays} Absent Days` : 'N/A'}
            trendColor={attendance?.absentDays > 0 ? 'danger' : 'active'}
          />
          <StatCard
            icon={FileText}
            label="Enrolled Courses"
            value="6"
            trend="Core Curriculum"
            trendColor="info"
          />
        </div>

        {/* Sample Table Block */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Upcoming Assessments</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tasks and test events scheduled for the next 7 days.</p>
            </div>
            <button className="text-xs font-bold text-navy-800 hover:text-navy-700 transition-colors flex items-center space-x-1">
              <span>View Full Calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment Type</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Due / Scheduled Date</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingAssessments.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-600">{row.id}</td>
                    <td className="py-4 px-6 text-sm font-bold text-navy-950">{row.subject}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">{row.type}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{row.date}</td>
                    <td className="py-4 px-6 text-sm">
                      <StatusBadge status={row.status} label={row.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;

