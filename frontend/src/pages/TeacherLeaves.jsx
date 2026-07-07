import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Plus,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getMyLeaves, submitLeave } from '../features/leaves/leaveService';

const CATEGORIES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other Leave' }
];

const TeacherLeaves = () => {
  const { user } = useAuth();

  // Sidebar items
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher-dashboard' },
    { label: 'Mark Attendance', icon: Calendar, path: '/teacher/attendance' },
    { label: 'My Leaves', icon: CalendarDays, path: '/teacher/leaves' }
  ];

  // States
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('casual');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyLeaves();
      if (res.success) {
        setLeaves(res.data || []);
      } else {
        throw new Error(res.message || 'Failed to retrieve leaves.');
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
      setError(err.message || 'Could not load leaves. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Compute Stats
  const stats = React.useMemo(() => {
    let pending = 0;
    let approved = 0;
    let totalDays = 0;

    leaves.forEach((l) => {
      if (l.status === 'pending') pending++;
      if (l.status === 'approved') {
        approved++;
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        totalDays += diffDays;
      }
    });

    return { pending, approved, totalDays };
  }, [leaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitLeave({
        startDate,
        endDate,
        category,
        reason: reason.trim()
      });

      if (res.success) {
        toast.success('Leave request submitted successfully.');
        setIsModalOpen(false);
        // Reset form
        setStartDate('');
        setEndDate('');
        setCategory('casual');
        setReason('');
        fetchLeaves();
      } else {
        throw new Error(res.message || 'Submission failed.');
      }
    } catch (err) {
      console.error('Error submitting leave:', err);
      toast.error(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
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

  return (
    <DashboardLayout
      navItems={navItems}
      userName={user?.name}
      userRole={user?.role}
      subtitle="Teacher Leaves"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight font-display">My Leaves</h1>
            <p className="text-sm text-gray-500 mt-1">
              Apply for leave and track the status of your applications.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-navy-primary hover:bg-navy-primary/95 text-white font-bold py-2.5 px-5 rounded-xl flex items-center space-x-2 transition-all duration-200 shadow-md text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Apply For Leave</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={Clock} label="Pending Requests" value={stats.pending} />
          <StatCard icon={CheckCircle} label="Approved Leaves" value={stats.approved} />
          <StatCard icon={CalendarDays} label="Total Approved Absence (Days)" value={stats.totalDays} />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error loading leaves records</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Main List */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-navy-950 font-display">Leave Application Roster</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Overview of all your submitted leave requests and admin response comments.
              </p>
            </div>
            <button
              onClick={fetchLeaves}
              className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin h-8 w-8 text-navy-primary mx-auto" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">
                Fetching leave applications...
              </p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-base font-bold text-navy-950">No Leave History</h3>
              <p className="mt-2 text-xs text-gray-500">
                You haven't submitted any leave applications yet. Click "Apply For Leave" to start.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Leave Period</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-semibold text-navy-950 whitespace-nowrap">
                        <div>{formatDate(leave.startDate)}</div>
                        <div className="text-xs text-gray-400 font-medium">to {formatDate(leave.endDate)}</div>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-gray-600 capitalize">
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
                      <td className="py-4 px-6 text-sm italic text-gray-500 max-w-xs truncate" title={leave.adminComments}>
                        {leave.adminComments || <span className="text-gray-300 font-normal">No comments yet</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Leave Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-navy-950 font-display">New Leave Request</h3>
                <p className="text-xs text-gray-400">Fill in the details below to request leave.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 text-sm focus:border-navy-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 text-sm focus:border-navy-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Leave Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 text-sm bg-white focus:border-navy-primary focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Reason / Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Describe your reason for requesting leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 text-sm focus:border-navy-primary focus:outline-none resize-none"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-navy-primary hover:bg-navy-primary/95 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md focus:outline-none flex items-center space-x-2 cursor-pointer"
                >
                  {submitting && <RefreshCw className="animate-spin h-4 w-4" />}
                  <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherLeaves;
