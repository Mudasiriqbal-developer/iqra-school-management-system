import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Award, BookOpen, Calendar, DollarSign, BarChart3, Plus, ArrowRight, Wallet, GraduationCap, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { getDashboardSummary } from '../features/dashboard/dashboardService';
import AttendanceTrendChart from '../features/dashboard/AttendanceTrendChart';

// Skeletons for smooth loading visual state
const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between animate-pulse">
    <div className="flex justify-between items-start">
      <div className="w-12 h-12 bg-gray-100 rounded-xl border border-gray-200/20" />
      <div className="w-16 h-5 bg-gray-100 rounded-full" />
    </div>
    <div className="mt-6 space-y-2.5">
      <div className="h-8 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 animate-pulse">
    <div className="mb-6 space-y-2.5">
      <div className="h-6 bg-gray-100 rounded w-1/4" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
    </div>
    <div className="h-[300px] bg-gray-50/50 rounded-xl flex items-center justify-center border border-dashed border-gray-200/80">
      <div className="w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardSummary();
      if (res.success) {
        setDashboardData(res.data);
      } else {
        throw new Error(res.message || 'Failed to fetch summary data');
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      setError(err.message || 'An error occurred while loading dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Attendance', icon: Calendar, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  const recentRegistrations = [
    { id: 'REG001', name: 'Zainab Fatima', role: 'Student', date: 'July 03, 2026', status: 'active' },
    { id: 'REG002', name: 'Muhammad Ali', role: 'Student', date: 'July 02, 2026', status: 'active' },
    { id: 'REG003', name: 'Ayesha Khan', role: 'Teacher', date: 'June 30, 2026', status: 'pending' },
    { id: 'REG004', name: 'Omar Farooq', role: 'Student', date: 'June 28, 2026', status: 'danger' },
    { id: 'REG005', name: 'Sana Ahmed', role: 'Student', date: 'June 25, 2026', status: 'active' },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Mudasir Iqbal"
      userRole="Administrator"
      subtitle="Administrative Suite"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">System Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Manage school admissions, payroll, schedule, and reporting.</p>
          </div>
          <button className="bg-navy-900 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 hover:bg-navy-800 transition-colors shadow-sm text-sm">
            <Plus className="h-4 w-4" />
            <span>Add Student / Staff</span>
          </button>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 shadow-sm transition-all duration-300">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="font-semibold text-sm">{error}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 4 StatCards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : error ? (
            <>
              <StatCard icon={Users} label="Total Students" value="--" />
              <StatCard icon={GraduationCap} label="Total Faculty" value="--" />
              <StatCard icon={DollarSign} label="Fees Collected" value="--" />
              <StatCard icon={Calendar} label="Attendance Today" value="--" />
            </>
          ) : (
            <>
              {/* 1. Total Students */}
              <StatCard
                icon={Users}
                label="Total Students"
                value={dashboardData?.totalStudents?.toLocaleString() || '0'}
              />

              {/* 2. Total Faculty */}
              <StatCard
                icon={GraduationCap}
                label="Total Faculty"
                value={dashboardData?.totalTeachers?.toLocaleString() || '0'}
              />

              {/* 3. Fees Collected */}
              <StatCard
                icon={DollarSign}
                label={
                  <span className="space-y-2 mt-2 block">
                    <span className="text-sm font-medium text-gray-500 block">Fees Collected</span>
                    <span className="w-full bg-navy-50 h-1.5 rounded-full overflow-hidden border border-navy-100/30 block">
                      <span
                        className="bg-[#00215E] h-full rounded-full transition-all duration-500 block"
                        style={{ width: `${dashboardData?.feesSummary?.collectionPercentage || 0}%` }}
                      />
                    </span>
                  </span>
                }
                value={`Rs. ${(dashboardData?.feesSummary?.totalCollected || 0).toLocaleString()} / Rs. ${((dashboardData?.feesSummary?.totalCollected || 0) + (dashboardData?.feesSummary?.totalOutstanding || 0)).toLocaleString()}`}
              />

              {/* 4. Attendance Today */}
              <StatCard
                icon={Calendar}
                label="Attendance Today"
                value={
                  dashboardData?.attendanceToday?.noDataYet ? (
                    <span className="text-xl font-bold text-gray-400">Not marked yet</span>
                  ) : (
                    `${dashboardData?.attendanceToday?.presentPercentage || 0}%`
                  )
                }
                trend={
                  dashboardData?.attendanceToday?.noDataYet
                    ? null
                    : (dashboardData?.attendanceToday?.presentPercentage || 0) > 90
                    ? 'High Engagement'
                    : (dashboardData?.attendanceToday?.presentPercentage || 0) < 75
                    ? 'Needs Attention'
                    : null
                }
                trendColor={
                  dashboardData?.attendanceToday?.noDataYet
                    ? null
                    : (dashboardData?.attendanceToday?.presentPercentage || 0) > 90
                    ? 'active'
                    : (dashboardData?.attendanceToday?.presentPercentage || 0) < 75
                    ? 'pending'
                    : null
                }
              />
            </>
          )}
        </div>

        {/* Monthly Attendance Trend Chart */}
        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 text-center text-gray-400 text-sm py-12">
            No attendance trend data available.
          </div>
        ) : (
          <AttendanceTrendChart data={dashboardData?.monthlyAttendanceTrend || []} />
        )}

        {/* Sample Table Block */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Recent Registrations</h2>
              <p className="text-xs text-gray-400 mt-0.5">List of newly registered students and faculty pending validation.</p>
            </div>
            <button className="text-xs font-bold text-navy-800 hover:text-navy-700 transition-colors flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Joined</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRegistrations.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-600">{row.id}</td>
                    <td className="py-4 px-6 text-sm font-bold text-navy-950">{row.name}</td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-600">{row.role}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{row.date}</td>
                    <td className="py-4 px-6 text-sm">
                      <StatusBadge status={row.status} label={row.status === 'active' ? 'Active' : row.status === 'pending' ? 'Pending' : 'Suspended'} />
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

export default AdminDashboard;
