import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  Calendar,
  CalendarCheck,
  BarChart3,
  Wallet,
  Plus,
  Search,
  Filter,
  CreditCard,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import {
  getFeeSummary,
  getStudents,
  getClasses,
  getSectionsByClass
} from '../features/fees/feeService';

import SetFeeStructureModal from '../features/fees/SetFeeStructureModal';
import RecordPaymentModal from '../features/fees/RecordPaymentModal';
import FeeHistoryDrawer from '../features/fees/FeeHistoryDrawer';

const AdminFees = () => {
  // Navigation sidebar configuration
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  // Component Modals/Drawers visibility
  const [isSetFeeOpen, setIsSetFeeOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Target Student for Modal operations
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Dropdown lists
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  // Filters state
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Roster / Stats states
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({
    totalStudents: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalCollected: 0,
    totalOutstanding: 0
  });

  // Table loading state
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await getClasses();
        if (res.success) {
          setClassesList(res.data);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load classes');
      }
    };
    loadClasses();
  }, []);

  // Fetch sections when class changes
  useEffect(() => {
    const loadSections = async () => {
      setSectionId('');
      if (!classId) {
        setSectionsList([]);
        return;
      }
      try {
        const res = await getSectionsByClass(classId);
        if (res.success) {
          setSectionsList(res.data);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load sections');
      }
    };
    loadSections();
  }, [classId]);

  // Combined fetch function for both stats summary & student dues roster
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch scoped summary statistics
      const summaryRes = await getFeeSummary(classId || undefined, sectionId || undefined);
      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }

      // 2. Fetch all matching students to filter & paginate locally
      // Using a large limit (1000) to retrieve all relevant student records for local filter by feeInfo.status and search
      const params = {
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        limit: 1000
      };

      const studentsRes = await getStudents(params);
      if (studentsRes.success) {
        const allStudents = studentsRes.data.students || [];

        // Apply search filter (name or registration number)
        let filtered = allStudents;
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          filtered = filtered.filter(s => 
            s.fullName?.toLowerCase().includes(query) ||
            s.registrationNumber?.toLowerCase().includes(query)
          );
        }

        // Apply payment status filter
        if (paymentStatus) {
          filtered = filtered.filter(s => s.feeInfo?.status === paymentStatus);
        }

        // Sort: overdue first, then pending, then paid
        const statusPriority = { overdue: 1, pending: 2, paid: 3 };
        filtered.sort((a, b) => {
          const priorityA = statusPriority[a.feeInfo?.status] || 99;
          const priorityB = statusPriority[b.feeInfo?.status] || 99;
          return priorityA - priorityB;
        });

        // Set pagination bounds
        setTotalStudentsCount(filtered.length);
        const calculatedPages = Math.ceil(filtered.length / limit) || 1;
        setTotalPages(calculatedPages);

        // Adjust current page if it exceeds newly calculated total pages
        const activePage = page > calculatedPages ? 1 : page;
        if (activePage !== page) {
          setPage(activePage);
        }

        // Slice for active page display
        const startIndex = (activePage - 1) * limit;
        const sliced = filtered.slice(startIndex, startIndex + limit);
        setStudents(sliced);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reload fee records');
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, paymentStatus, searchTerm, page, limit]);

  // Load data when filters or pagination page changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format Date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Get status badge mapping props
  const getFeeBadgeProps = (feeStatus) => {
    switch (feeStatus) {
      case 'paid':
        return { status: 'active', label: 'Paid' };
      case 'pending':
        return { status: 'pending', label: 'Pending' };
      case 'overdue':
        return { status: 'danger', label: 'Overdue' };
      default:
        return { status: 'default', label: feeStatus || 'Unset' };
    }
  };

  const handleOpenRecordPayment = (student) => {
    setSelectedStudent(student);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenHistory = (student) => {
    setSelectedStudent(student);
    setIsHistoryOpen(true);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data refreshed successfully');
  };

  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

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
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Fee Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor student accounts, collection history, and outstanding balances.
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
            <button
              onClick={() => setIsSetFeeOpen(true)}
              className="bg-navy-primary text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 hover:opacity-90 transition-opacity shadow-sm text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Set Fee Structure</span>
            </button>
          </div>
        </div>

        {/* Top Summary Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={TrendingUp}
            label="Total Collected"
            value={`Rs. ${summary.totalCollected}`}
            trend="Received Payments"
            trendColor="active"
          />
          <StatCard
            icon={AlertTriangle}
            label="Pending Amount"
            value={`Rs. ${summary.totalOutstanding}`}
            trend="Uncollected Balance"
            trendColor="pending"
          />
          <StatCard
            icon={DollarSign}
            label="Overdue Accounts"
            value={summary.overdueCount.toString()}
            trend="Passed Due Date"
            trendColor="danger"
          />
          <StatCard
            icon={Users}
            label="Total Students"
            value={summary.totalStudents.toString()}
            trend="Roster Count"
            trendColor="info"
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Field */}
          <div className="w-full md:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search student by name or reg no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary text-xs bg-gray-50 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Filtering Dropdowns */}
          <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap gap-3 items-center justify-end">
            <div className="flex items-center space-x-1.5 text-gray-400">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Filters</span>
            </div>

            {/* Class Dropdown */}
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-primary/20 font-bold"
            >
              <option value="">All Classes</option>
              {classesList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Section Dropdown */}
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setPage(1);
              }}
              disabled={!classId}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-primary/20 disabled:bg-gray-50 disabled:text-gray-400 font-bold"
            >
              <option value="">
                {!classId ? 'Select class first' : 'All Sections'}
              </option>
              {sectionsList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Payment Status Dropdown */}
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-primary/20 font-bold"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Student Fee Records Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          {loading && students.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-navy-primary border-t-transparent"></div>
              <p className="text-sm font-bold text-navy-950 mt-4">Loading student records...</p>
            </div>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Profile</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Class / Section</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount Due</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount Paid</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => {
                    const badgeProps = getFeeBadgeProps(student.feeInfo?.status);
                    return (
                      <tr key={student._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-navy-950">{student.fullName}</div>
                            <div className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                              Reg: {student.registrationNumber}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-semibold text-gray-700 text-sm">
                              {student.classId?.name || 'N/A'}
                            </div>
                            <div className="text-xxs text-gray-400 font-semibold mt-0.5">
                              Sec: {student.sectionId?.name || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-navy-950 text-sm">
                          Rs. {student.feeInfo?.amountDue || 0}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-600 text-sm">
                          Rs. {student.feeInfo?.amountPaid || 0}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                          {formatDate(student.feeInfo?.dueDate)}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenRecordPayment(student)}
                              title="Record Payment"
                              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                            >
                              <CreditCard className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenHistory(student)}
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
              <p className="text-sm text-gray-400 italic">No matching fee records found.</p>
            </div>
          )}

          {/* Table Footer / Pagination */}
          {!loading && students.length > 0 && (
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Showing {students.length} of {totalStudentsCount} Record(s)
              </span>

              <div className="flex items-center space-x-2">
                {/* Prev Button */}
                <button
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-45 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {pagesArray.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        page === p
                          ? 'bg-navy-primary text-white shadow-sm'
                          : 'text-navy-primary hover:bg-gray-100 bg-white border border-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-45 disabled:hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modals & Drawer components */}
      <SetFeeStructureModal
        isOpen={isSetFeeOpen}
        onClose={() => setIsSetFeeOpen(false)}
        onSuccess={fetchData}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={fetchData}
      />

      <FeeHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </DashboardLayout>
  );
};

export default AdminFees;
