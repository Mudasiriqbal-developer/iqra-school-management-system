import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, Award, CreditCard, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';

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
            <p className="text-sm text-gray-600 mt-1">Review academic summary, attendance record, class schedules, and fee details.</p>
          </div>
        </div>

        {/* Dynamic StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;


