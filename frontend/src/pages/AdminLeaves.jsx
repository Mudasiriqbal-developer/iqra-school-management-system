import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  Wallet,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  BarChart3,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  Search,
  Filter,
  Eye,
  CalendarClock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getPendingLeaves, getAllLeaves, updateLeaveStatus } from '../features/leaves/leaveService';

const CATEGORIES = [
  { value: 'sick', label: 'Sick' },
  { value: 'casual', label: 'Casual' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' }
];

const AdminLeaves = () => {
  const { user } = useAuth();

  // Sidebar configuration
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

  // Core States
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State for History
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal / Action State
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approved' or 'rejected'
  const [adminComment, setAdminComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch pending leaves
  const fetchPending = async () => {
    const res = await getPendingLeaves();
    if (res.success) {
      setPendingRequests(res.data || []);
    } else {
      throw new Error(res.message || 'Failed to fetch pending requests.');
    }
  };

  // Fetch all leaves history
  const fetchAll = async () => {
    const res = await getAllLeaves({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    });
    if (res.success) {
      setAllRequests(res.data || []);
    } else {
      throw new Error(res.message || 'Failed to fetch all leave records.');
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'pending') {
        await fetchPending();
      } else {
        await fetchAll();
      }
    } catch (err) {
      console.error('Error fetching admin leaves data:', err);
      setError(err.message || 'Failed to sync leaves dashboard. Please reload.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute stats
  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pendingCount = pendingRequests.length;
    let activeAbsences = 0;

    // Estimate active absences using all requests currently approved and dates range overlapping today
    allRequests.forEach((r) => {
      if (r.status === 'approved') {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (today >= start && today <= end) {
          activeAbsences++;
        }
      }
    });

    return { pendingCount, activeAbsences };
  }, [pendingRequests, allRequests]);

  // Handle open decision modal
  const openDecisionModal = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setAdminComment('');
    setIsDecisionOpen(true);
  };

  const [isDecisionOpen, setIsDecisionOpen] = useState(false);

  // Submit leave request status decision
  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeave || !actionType) return;

    try {
      setSubmittingAction(true);
      const res = await updateLeaveStatus(selectedLeave._id, {
        status: actionType,
        adminComments: adminComment.trim(),
      });

      if (res.success) {
        toast.success(`Leave request successfully ${actionType}.`);
        setIsDecisionOpen(false);
        setSelectedLeave(null);
        // Refresh appropriate tabs
        if (activeTab === 'pending') {
          fetchPending();
        } else {
          fetchAll();
        }
        // Force refresh the other list in the background
        if (activeTab === 'pending') {
          getAllLeaves().then(r => r.success && setAllRequests(r.data));
        } else {
          getPendingLeaves().then(r => r.success && setPendingRequests(r.data));
        }
      } else {
        throw new Error(res.message || 'Operation failed.');
      }
    } catch (err) {
      console.error('Error updating leave request:', err);
      toast.error(err.message || 'Failed to update leave status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter history list client side by teacher name or employeeId
  const filteredHistoryList = React.useMemo(() => {
    if (!searchTerm.trim()) return allRequests;
    const term = searchTerm.toLowerCase();
    return allRequests.filter((r) => {
      const teacherName = r.teacherId?.userId?.name?.toLowerCase() || '';
      const empId = r.teacherId?.employeeId?.toLowerCase() || '';
      const reasonText = r.reason?.toLowerCase() || '';
      return teacherName.includes(term) || empId.includes(term) || reasonText.includes(term);
    });
  }, [allRequests, searchTerm]);

  return (
    <DashboardLayout
      navItems={navItems}
      userName={user?.name}
      userRole={user?.role}
      subtitle="Leave Approvals"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight font-display">Faculty Leaves</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review pending leave requests, check active absences, and view full HR leave logs.
            </p>
          </div>
          <button
            onClick={loadData}
            className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 transition-colors shadow-sm text-sm cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={CalendarClock} label="Pending Approvals" value={stats.pendingCount} />
          <StatCard icon={CalendarDays} label="Active Absences Today" value={stats.activeAbsences} />
          <StatCard icon={Users} label="Total Registered Faculty" value={user?.role === 'admin' ? 'Active' : '--'} />
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Connection error syncing leave data</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Tab Toggle Switch & Filters */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-5">
            {/* Tab Links */}
            <div className="flex bg-gray-100 p-1.5 rounded-xl space-x-1.5">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-white text-navy-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Pending Requests ({pendingRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-navy-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                All Leaves History
              </button>
            </div>

            {/* Conditionally Render Filters */}
            {activeTab === 'history' && (
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Search Term */}
                <div className="relative flex-1 min-w-[200px] lg:flex-initial">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search teacher, code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:border-navy-primary focus:outline-none"
                  />
                </div>

                {/* Status Dropdown */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:border-navy-primary focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Category Dropdown */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:border-navy-primary focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Rosters */}
          {activeTab === 'pending' ? (
            // Pending Requests list
            loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="animate-spin h-8 w-8 text-navy-primary mx-auto" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">
                  Syncing pending applications...
                </p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto">
                <CalendarClock className="mx-auto h-12 w-12 text-gray-200" />
                <h3 className="mt-4 text-base font-bold text-navy-950">Inbox Clear</h3>
                <p className="mt-2 text-xs text-gray-400">
                  There are no pending leave requests waiting for your approval.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Faculty Details</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Absence Interval</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingRequests.map((leave) => {
                      const start = new Date(leave.startDate);
                      const end = new Date(leave.endDate);
                      const diffTime = Math.abs(end - start);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                      return (
                        <tr key={leave._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6 text-sm font-bold text-navy-950">
                            <div>{leave.teacherId?.userId?.name || 'Deleted Account'}</div>
                            <div className="text-xs text-gray-400 font-medium font-mono">
                              ID: {leave.teacherId?.employeeId || 'N/A'}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-gray-700 whitespace-nowrap">
                            <div>{formatDate(leave.startDate)}</div>
                            <div className="text-xs text-gray-400 font-medium">
                              to {formatDate(leave.endDate)} ({diffDays} {diffDays === 1 ? 'day' : 'days'})
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-gray-600 capitalize whitespace-nowrap">
                            {leave.category}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-500 max-w-xs truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="py-4 px-6 text-sm text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => openDecisionModal(leave, 'approved')}
                              className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Approve leave"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDecisionModal(leave, 'rejected')}
                              className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Reject leave"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // Full Leaves History Roster
            loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="animate-spin h-8 w-8 text-navy-primary mx-auto" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">
                  Retrieving complete logs...
                </p>
              </div>
            ) : filteredHistoryList.length === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto">
                <Search className="mx-auto h-12 w-12 text-gray-200" />
                <h3 className="mt-4 text-base font-bold text-navy-950">No Results Found</h3>
                <p className="mt-2 text-xs text-gray-400">
                  Try adjusting your search query or filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Faculty Details</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Leave Interval</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistoryList.map((leave) => {
                      const start = new Date(leave.startDate);
                      const end = new Date(leave.endDate);
                      const diffTime = Math.abs(end - start);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                      return (
                        <tr key={leave._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6 text-sm font-bold text-navy-950">
                            <div>{leave.teacherId?.userId?.name || 'Deleted Account'}</div>
                            <div className="text-xs text-gray-400 font-medium font-mono">
                              ID: {leave.teacherId?.employeeId || 'N/A'}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-gray-700 whitespace-nowrap">
                            <div>{formatDate(leave.startDate)}</div>
                            <div className="text-xs text-gray-400 font-medium">
                              to {formatDate(leave.endDate)} ({diffDays} {diffDays === 1 ? 'day' : 'days'})
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-gray-600 capitalize whitespace-nowrap">
                            {leave.category}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-500 max-w-xs truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="py-4 px-6 text-sm whitespace-nowrap">
                            <StatusBadge
                              status={leave.status === 'approved' ? 'active' : leave.status === 'pending' ? 'pending' : 'danger'}
                              label={leave.status}
                            />
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-500 italic max-w-xs truncate" title={leave.adminComments}>
                            {leave.adminComments || <span className="text-gray-300 font-normal">None recorded</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Decision Approve/Reject Modal */}
      {isDecisionOpen && selectedLeave && (
        <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-navy-950 font-display">
                  {actionType === 'approved' ? 'Approve Leave' : 'Reject Leave'}
                </h3>
                <p className="text-xs text-gray-400">
                  Review the leave application details and add your remarks.
                </p>
              </div>
              <button
                onClick={() => setIsDecisionOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} className="p-6 space-y-4">
              {/* Application Details Summary */}
              <div className="p-4 bg-gray-50 rounded-xl text-xs space-y-2 border border-gray-100">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Teacher:</span>
                  <span className="font-bold text-navy-950">{selectedLeave.teacherId?.userId?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Employee ID:</span>
                  <span className="font-semibold text-gray-700">{selectedLeave.teacherId?.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Period:</span>
                  <span className="font-semibold text-gray-700">
                    {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Category:</span>
                  <span className="font-bold text-navy-950 capitalize">{selectedLeave.category}</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-500 block mb-1">Reason:</span>
                  <p className="text-gray-600 leading-normal italic font-medium">"{selectedLeave.reason}"</p>
                </div>
              </div>

              {/* Admin Comments */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Admin Comments / Remarks
                </label>
                <textarea
                  rows="3"
                  placeholder="Optional notes or instructions for the teacher..."
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 text-sm focus:border-navy-primary focus:outline-none resize-none"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDecisionOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md focus:outline-none flex items-center space-x-2 cursor-pointer text-white ${
                    actionType === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-600/95'
                      : 'bg-red-600 hover:bg-red-600/95'
                  }`}
                >
                  {submittingAction && <RefreshCw className="animate-spin h-4 w-4" />}
                  <span>
                    {submittingAction
                      ? 'Saving...'
                      : actionType === 'approved'
                      ? 'Approve Application'
                      : 'Reject Application'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminLeaves;
