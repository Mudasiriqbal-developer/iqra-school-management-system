import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  CalendarCheck,
  BarChart3,
  Wallet,
  Plus,
  RefreshCw,
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  X,
  CalendarClock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import {
  getPayrollOverview,
  processSalaryPayout,
  getPayrollHistory
} from '../features/finance/financeService';

const AdminPayroll = () => {
  // Navigation sidebar configuration
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Expense Tracker', icon: TrendingDown, path: '/admin/expenses' },
    { label: 'Salary Payroll', icon: DollarSign, path: '/admin/payroll' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  // Month Picker (default to current month e.g., "2026-07")
  const getCurrentMonthStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState({
    totalTeachers: 0,
    totalPayrollAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(false);

  // Modals / Drawer visibility
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [targetTeacher, setTargetTeacher] = useState(null);

  // Form State
  const [allowances, setAllowances] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [status, setStatus] = useState('paid');
  const [submitLoading, setSubmitLoading] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch Payroll Overview
  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPayrollOverview(selectedMonth);
      if (res.success) {
        setRoster(res.data.roster);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payroll overview');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  // Open payout Modal
  const handleOpenPayout = (teacher) => {
    setTargetTeacher(teacher);
    setAllowances(0);
    setDeductions(0);
    setPaymentMethod('bank_transfer');
    setStatus('paid');
    setIsPayoutModalOpen(true);
  };

  // Process salary request
  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    if (!targetTeacher) return;

    try {
      setSubmitLoading(true);
      const baseSalary = targetTeacher.baseSalary;
      const netSalary = baseSalary + Number(allowances) - Number(deductions);
      if (netSalary < 0) {
        toast.error('Deductions cannot exceed the sum of base salary and allowances');
        return;
      }

      const payload = {
        teacherId: targetTeacher.teacherId,
        month: selectedMonth,
        allowances: Number(allowances),
        deductions: Number(deductions),
        paymentMethod,
        status
      };

      const res = await processSalaryPayout(payload);
      if (res.success) {
        toast.success(res.message);
        setIsPayoutModalOpen(false);
        fetchPayroll();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to process salary payout');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Open history Drawer
  const handleOpenHistory = async (teacher) => {
    setTargetTeacher(teacher);
    setIsHistoryDrawerOpen(true);
    try {
      setHistoryLoading(true);
      const res = await getPayrollHistory(teacher.teacherId);
      if (res.success) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load teacher payroll history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // UI status badge helper
  const getBadgeProps = (stat) => {
    return stat === 'paid' ? { status: 'active', label: 'Paid' } : { status: 'pending', label: 'Pending' };
  };

  const formatMonthName = (mStr) => {
    if (!mStr) return '';
    const [year, month] = mStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleRefresh = () => {
    fetchPayroll();
    toast.success('Payroll refreshed');
  };

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
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Faculty Payroll</h1>
            <p className="text-sm text-gray-500 mt-1">
              Disburse monthly salaries, set allowances/deductions, and review payment audit reports.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-navy-950 focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 font-bold"
            />
          </div>
        </div>

        {/* Financial Stat Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={DollarSign}
            label="Total Payroll Burden"
            value={`Rs. ${summary.totalPayrollAmount.toLocaleString()}`}
            trend={`Month: ${formatMonthName(selectedMonth)}`}
            trendColor="info"
          />
          <StatCard
            icon={CreditCard}
            label="Disbursed (Paid)"
            value={`Rs. ${summary.totalPaid.toLocaleString()}`}
            trend={`${summary.paidCount} Payouts processed`}
            trendColor="active"
          />
          <StatCard
            icon={TrendingDown}
            label="Outflow Outstanding"
            value={`Rs. ${summary.totalPending.toLocaleString()}`}
            trend={`${summary.pendingCount} Salaries pending`}
            trendColor="danger"
          />
          <StatCard
            icon={Users}
            label="Total Teachers"
            value={summary.totalTeachers.toString()}
            trend="Active Accounts"
            trendColor="default"
          />
        </div>

        {/* Faculty Payroll Roster Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-sm font-extrabold text-navy-950 uppercase tracking-wide">
                Staff Payroll Roster — {formatMonthName(selectedMonth)}
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#00215E] border-t-transparent"></div>
              <p className="text-sm font-bold text-navy-950 mt-4">Compiling staff billing logs...</p>
            </div>
          ) : roster.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Teacher Profile</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Base Salary</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Allowances</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Deductions</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Net Salary</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roster.map((row) => {
                    const statusVal = row.payrollRecord?.status || 'pending';
                    const badge = getBadgeProps(statusVal);
                    return (
                      <tr key={row.teacherId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-navy-950">{row.fullName}</div>
                            <div className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                              ID: {row.employeeId} | {row.qualification || 'No Degree'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right text-sm text-gray-600 font-medium">
                          Rs. {row.baseSalary?.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right text-sm text-emerald-600 font-semibold">
                          +Rs. {(row.payrollRecord?.allowances || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right text-sm text-red-600 font-semibold">
                          -Rs. {(row.payrollRecord?.deductions || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-navy-950 text-sm">
                          Rs. {(row.payrollRecord?.netSalary || row.baseSalary).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-xs text-gray-600 font-semibold uppercase tracking-wider">
                          {row.payrollRecord?.paymentMethod?.replace('_', ' ') || 'cash'}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={badge.status} label={badge.label} />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenPayout(row)}
                              disabled={statusVal === 'paid'}
                              title="Process Payout"
                              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-35 disabled:hover:bg-transparent"
                            >
                              <CreditCard className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenHistory(row)}
                              title="View History"
                              className="p-2 text-navy-primary hover:bg-slate-100 rounded-xl transition-all"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 text-center bg-slate-50 border border-dashed border-gray-150 rounded-b-2xl m-4">
              <p className="text-sm text-gray-400 italic">No faculty accounts found in database.</p>
            </div>
          )}
        </div>
      </div>

      {/* Salary Payout Modal */}
      {isPayoutModalOpen && targetTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-extrabold text-navy-950 text-base">
                Disburse Monthly Salary
              </h2>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePayoutSubmit} className="p-6 space-y-4">
              {/* Teacher Info Summary */}
              <div className="p-4 bg-navy-50/50 rounded-xl border border-navy-100/30">
                <div className="text-xxs font-bold text-navy-primary uppercase tracking-wide">Paying Faculty</div>
                <div className="font-extrabold text-navy-950 text-sm mt-0.5">{targetTeacher.fullName}</div>
                <div className="text-xxs text-gray-500 font-semibold mt-0.5">Emp ID: {targetTeacher.employeeId}</div>
              </div>

              {/* Base Salary Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Base Salary (Rs.)
                  </label>
                  <input
                    type="text"
                    value={`Rs. ${targetTeacher.baseSalary?.toLocaleString()}`}
                    disabled
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold focus:outline-none"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-bold"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Allowances & Deductions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-emerald-600">
                    Allowances (+ Rs.)
                  </label>
                  <input
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(Number(e.target.value))}
                    min="0"
                    placeholder="Allowances"
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-red-500">
                    Deductions (- Rs.)
                  </label>
                  <input
                    type="number"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    min="0"
                    placeholder="Deductions"
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-bold text-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Payout Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-semibold"
                  >
                    <option value="paid">Disbursed (Paid)</option>
                    <option value="pending">Mark as Pending</option>
                  </select>
                </div>

                {/* Net Salary Preview */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-center items-center">
                  <div className="text-xxs text-gray-400 font-bold uppercase tracking-wider">Net Amount</div>
                  <div className="text-sm font-extrabold text-navy-primary mt-0.5">
                    Rs. {(targetTeacher.baseSalary + Number(allowances) - Number(deductions)).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2 bg-[#00215E] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitLoading ? 'Saving...' : 'Disburse Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {isHistoryDrawerOpen && targetTeacher && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="font-extrabold text-navy-950 text-base">Salary Payout Logs</h2>
              <p className="text-xxs text-gray-500 font-semibold">{targetTeacher.fullName}</p>
            </div>
            <button
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-gray-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {historyLoading ? (
              <div className="py-24 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#00215E] border-t-transparent"></div>
                <p className="text-xs font-bold text-navy-950 mt-4">Retrieving salary ledger...</p>
              </div>
            ) : historyList.length > 0 ? (
              <div className="space-y-3.5">
                {historyList.map((log) => (
                  <div key={log._id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-navy-950 text-sm">{formatMonthName(log.month)}</span>
                      <StatusBadge status={getBadgeProps(log.status).status} label={getBadgeProps(log.status).label} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-b border-gray-100 py-2.5 text-xxs font-bold text-gray-400">
                      <div>
                        <span>Base Salary</span>
                        <div className="text-navy-950 text-xs font-semibold mt-0.5">Rs. {log.baseSalary?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span>Allowances</span>
                        <div className="text-emerald-600 text-xs font-semibold mt-0.5">+Rs. {log.allowances?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span>Deductions</span>
                        <div className="text-red-500 text-xs font-semibold mt-0.5">-Rs. {log.deductions?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="font-bold text-gray-400 uppercase text-xxs">Method: {log.paymentMethod?.replace('_', ' ')}</span>
                      <span className="font-extrabold text-[#00215E]">Net: Rs. {log.netSalary?.toLocaleString()}</span>
                    </div>
                    {log.paidOn && (
                      <div className="text-[10px] text-gray-400 text-right mt-1 italic font-medium">
                        Paid on {new Date(log.paidOn).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <p className="text-sm text-gray-400 italic">No salary payments found for this teacher.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminPayroll;
