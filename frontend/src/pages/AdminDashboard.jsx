import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Award, BookOpen, Calendar, CalendarCheck, DollarSign, BarChart3, Plus, ArrowRight, Wallet, GraduationCap, AlertCircle, RefreshCw, TrendingUp, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_NAV_ITEMS } from '../utils/navConstants';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { getDashboardSummary, getFeesSummary } from '../features/dashboard/dashboardService';
import AttendanceTrendChart from '../features/dashboard/AttendanceTrendChart';
import AdminFormModal from '../features/dashboard/AdminFormModal';
import FeeDetailsModal from '../features/dashboard/FeeDetailsModal';

// Skeletons for smooth loading visual state
const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between animate-pulse">
    <div className="flex justify-between items-start">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/60 rounded-xl border border-slate-200/40 dark:border-slate-700" />
      <div className="w-16 h-5 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
    </div>
    <div className="mt-6 space-y-2.5">
      <div className="h-8 bg-slate-100 dark:bg-slate-700/60 rounded w-2/3" />
      <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-1/2" />
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-6 animate-pulse">
    <div className="mb-6 space-y-2.5">
      <div className="h-6 bg-slate-100 dark:bg-slate-700/60 rounded w-1/4" />
      <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-1/3" />
    </div>
    <div className="h-[300px] bg-slate-50 dark:bg-slate-900/40 rounded-xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700">
      <div className="w-8 h-8 border-4 border-navy-900 dark:border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [feeSummaryData, setFeeSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [feeModalType, setFeeModalType] = useState(null); // 'collected', 'partial', or 'remaining'
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, feeRes] = await Promise.all([
        getDashboardSummary(),
        getFeesSummary()
      ]);
      
      if (summaryRes.success && feeRes.success) {
        setDashboardData(summaryRes.data);
        setFeeSummaryData(feeRes.data);
      } else {
        throw new Error(summaryRes.message || feeRes.message || 'Failed to fetch summary data');
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

  return (
    <DashboardLayout
      navItems={DEFAULT_NAV_ITEMS}
      userName={user?.name || "Administrator"}
      userRole={user?.role === 'admin' ? 'Administrator' : (user?.role || 'Administrator')}
      subtitle="Administrative Suite"
    >
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">System Overview</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage school admissions, payroll, schedule, and reporting.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-4 rounded-xl flex items-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-2xs text-sm"
            >
              <Plus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Create Admin</span>
            </button>
            <button
              onClick={() => navigate('/admin/students')}
              className="bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-colors shadow-2xs text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 shadow-xs transition-all duration-300">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="font-semibold text-sm">{error}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* StatCards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : error ? (
            <>
              <StatCard icon={Users} label="Total Students" value="--" />
              <StatCard icon={Wallet} label="Total Fee Expected" value="--" />
              <StatCard icon={DollarSign} label="Fees Collected" value="--" />
              <StatCard icon={RefreshCw} label="Partial Payments Dues" value="--" />
              <StatCard icon={AlertCircle} label="Total Remaining Fee" value="--" />
              <StatCard icon={TrendingUp} label="Net P&L" value="--" />
            </>
          ) : (
            <>
              {/* 1. Total Students */}
              <StatCard
                icon={Users}
                label="Total Students"
                value={feeSummaryData?.totalStudents?.toLocaleString() || '0'}
              />

              {/* 2. Total Fee Expected */}
              <StatCard
                icon={Wallet}
                label="Total Fee Expected"
                value={`Rs. ${(feeSummaryData?.totalFeeExpected || 0).toLocaleString()}`}
              />

              {/* 3. Fees Collected */}
              <StatCard
                icon={DollarSign}
                label={
                  <span className="space-y-1.5 mt-1 block">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Fees Collected</span>
                    <span className="w-full bg-slate-100 dark:bg-slate-700/80 h-1.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-600 block">
                      <span
                        className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500 block"
                        style={{
                          width: `${
                            feeSummaryData?.totalFeeExpected > 0
                              ? Math.min(100, Math.round((feeSummaryData.totalCollected / feeSummaryData.totalFeeExpected) * 100))
                              : 0
                          }%`
                        }}
                      />
                    </span>
                  </span>
                }
                value={`Rs. ${(feeSummaryData?.totalCollected || 0).toLocaleString()}`}
                onClick={() => {
                  setFeeModalType('collected');
                  setIsFeeModalOpen(true);
                }}
                badge="Drill-down & PDF"
              />

              {/* 4. Partial Payments */}
              <StatCard
                icon={RefreshCw}
                label="Partial Payments Dues"
                value={
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span>Rs. ${(feeSummaryData?.partialAmount || 0).toLocaleString()}</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-400">({feeSummaryData?.partialCount || 0} students)</span>
                  </div>
                }
                onClick={() => {
                  setFeeModalType('partial');
                  setIsFeeModalOpen(true);
                }}
                badge="Drill-down & PDF"
              />

              {/* 5. Total Remaining Fee */}
              <StatCard
                icon={AlertCircle}
                label="Total Remaining Fee"
                value={
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-rose-600 dark:text-rose-400">
                      Rs. {(
                        feeSummaryData?.remainingAmount !== undefined
                          ? feeSummaryData.remainingAmount
                          : Math.max(0, (feeSummaryData?.totalFeeExpected || 0) - (feeSummaryData?.totalCollected || 0))
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-400">
                      ({feeSummaryData?.remainingCount !== undefined ? feeSummaryData.remainingCount : (feeSummaryData?.partialCount || 0)} students)
                    </span>
                  </div>
                }
                onClick={() => {
                  setFeeModalType('remaining');
                  setIsFeeModalOpen(true);
                }}
                badge="Drill-down & PDF"
              />

              {/* 6. Profit & Loss Margin */}
              <StatCard
                icon={TrendingUp}
                label="Net P&L (Profit/Loss)"
                value={`Rs. ${(feeSummaryData?.netPL || 0).toLocaleString()}`}
                trend={`Spent: Rs. ${(dashboardData?.financialSummary?.totalExpenses || 0).toLocaleString()}`}
                trendColor={(feeSummaryData?.netPL || 0) >= 0 ? 'active' : 'danger'}
              />
            </>
          )}
        </div>

        {/* Monthly Attendance Trend Chart */}
        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-6 text-center text-slate-400 dark:text-slate-500 text-sm py-12">
            No attendance trend data available.
          </div>
        ) : (
          <AttendanceTrendChart data={dashboardData?.monthlyAttendanceTrend || []} />
        )}

        {/* Sample Table Block */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Registrations</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">List of newly registered students and faculty pending validation.</p>
            </div>
          </div>

          <div>
            {/* Stacked Cards for Mobile */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-700/80">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 animate-pulse space-y-2">
                    <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-28" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-16" />
                  </div>
                ))
              ) : (dashboardData?.recentRegistrations && dashboardData.recentRegistrations.length > 0) ? (
                dashboardData.recentRegistrations.map((row) => (
                  <div key={row.id} className="p-4 space-y-3 bg-white dark:bg-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{row.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{row.role}</div>
                      </div>
                      <StatusBadge status={row.status} label={row.status === 'active' ? 'Active' : row.status === 'pending' ? 'Pending' : 'Suspended'} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">ID</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{row.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Date Joined</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {row.date ? new Date(row.date).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 font-medium">
                  No recent registrations found.
                </div>
              )}
            </div>

            {/* Table for Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Joined</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80">
                  {loading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-6"><div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-16" /></td>
                        <td className="py-4 px-6"><div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-28" /></td>
                        <td className="py-4 px-6"><div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-16" /></td>
                        <td className="py-4 px-6"><div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-20" /></td>
                        <td className="py-4 px-6"><div className="h-6 bg-slate-100 dark:bg-slate-700/60 rounded-full w-20" /></td>
                      </tr>
                    ))
                  ) : (dashboardData?.recentRegistrations && dashboardData.recentRegistrations.length > 0) ? (
                    dashboardData.recentRegistrations.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-4 px-6 text-sm font-semibold text-slate-500 dark:text-slate-400">{row.id}</td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                        <td className="py-4 px-6 text-sm font-medium text-slate-600 dark:text-slate-300">{row.role}</td>
                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">
                          {row.date ? new Date(row.date).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <StatusBadge status={row.status} label={row.status === 'active' ? 'Active' : row.status === 'pending' ? 'Pending' : 'Suspended'} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 font-medium">
                        No recent registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <AdminFormModal 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)} 
      />
      <FeeDetailsModal
        isOpen={isFeeModalOpen}
        type={feeModalType}
        onClose={() => setIsFeeModalOpen(false)}
      />
    </DashboardLayout>
  );
};

export default AdminDashboard;
