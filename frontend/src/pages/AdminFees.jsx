import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  CalendarCheck,
  BarChart3,
  Wallet,
  Search,
  Filter,
  CreditCard,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import {
  getCurrentMonthFeeList,
  downloadReceipt,
  getClasses,
  getSectionsByClass
} from '../features/fees/feeService';

import WalletPaymentModal from '../features/fees/WalletPaymentModal';
import StudentLedgerDrawer from '../features/fees/StudentLedgerDrawer';

const AdminFees = () => {
  // Navigation sidebar configuration
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

  // Component Modals/Drawers visibility
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Target Student for Modal operations
  // Format: { studentId, fullName, registrationNumber, feeRecord }
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Dropdown lists
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  // Filters state
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Roster states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState({});

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

  // Fetch paginated students and fee records
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        status: paymentStatus || undefined,
        search: searchTerm || undefined,
        page,
        limit
      };

      const res = await getCurrentMonthFeeList(params);
      if (res.success) {
        setStudents(res.data.students || []);
        setTotalStudentsCount(res.data.total || 0);
        
        const calculatedPages = res.data.pages || 1;
        setTotalPages(calculatedPages);

        if (page > calculatedPages && calculatedPages > 0) {
          setPage(1);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reload fee records');
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, paymentStatus, searchTerm, page, limit]);

  // Load data on filter/pagination changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [classId, sectionId, paymentStatus, searchTerm]);

  // Summary Metrics computed locally from active results page
  const totalStudentsShown = students.length;
  const paidCount = students.filter(s => s.feeRecord?.status === 'paid').length;
  const pendingPartialCount = students.filter(
    s => s.feeRecord?.status === 'pending' || s.feeRecord?.status === 'partial'
  ).length;
  const totalCollectedThisMonth = students.reduce(
    (sum, s) => sum + (s.feeRecord?.amountPaid || 0),
    0
  );

  // Status badge mapping helper
  const getFeeBadgeProps = (feeStatus) => {
    switch (feeStatus) {
      case 'paid':
        return { status: 'active', label: 'Paid' };
      case 'partial':
        return { status: 'pending', label: 'Partial' };
      case 'pending':
        return { status: 'danger', label: 'Pending' };
      default:
        return { status: 'default', label: feeStatus || 'Unset' };
    }
  };

  const handleOpenWalletModal = (student) => {
    setSelectedStudent(student);
    setIsWalletModalOpen(true);
  };

  const handleOpenLedger = (student) => {
    setSelectedStudent(student);
    setIsLedgerOpen(true);
  };

  const handleDownloadReceipt = async (student) => {
    const studentId = student.studentId;
    const name = student.fullName;
    try {
      setDownloadingIds(prev => ({ ...prev, [studentId]: true }));
      await downloadReceipt(studentId, name);
      toast.success('PDF Receipt downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF receipt');
    } finally {
      setDownloadingIds(prev => ({ ...prev, [studentId]: false }));
    }
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
              Monitor monthly student billing, collect payments, and configure fee rates.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Stat Summary Cards (Calculated from active page list) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={TrendingUp}
            label="Total Collected"
            value={`Rs. ${totalCollectedThisMonth.toLocaleString()}`}
            trend="This page total"
            trendColor="active"
          />
          <StatCard
            icon={AlertTriangle}
            label="Unpaid Accounts"
            value={pendingPartialCount.toString()}
            trend="Pending/Partial status"
            trendColor="danger"
          />
          <StatCard
            icon={DollarSign}
            label="Paid Accounts"
            value={paidCount.toString()}
            trend="Current month paid"
            trendColor="active"
          />
          <StatCard
            icon={Users}
            label="Students Listed"
            value={totalStudentsShown.toString()}
            trend="Shown on page"
            trendColor="info"
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Input */}
          <div className="w-full md:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search student by name or reg no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary text-xs bg-gray-50 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Filters dropdown lists */}
          <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap gap-3 items-center justify-end">
            <div className="flex items-center space-x-1.5 text-gray-400">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Filters</span>
            </div>

            {/* Class Dropdown */}
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-primary/20 font-bold"
            >
              <option value="">All Classes</option>
              {classesList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.gender ? c.gender.charAt(0).toUpperCase() + c.gender.slice(1) : 'Mixed'}
                </option>
              ))}
            </select>

            {/* Section Dropdown */}
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
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
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-primary/20 font-bold"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {/* Student Fee Records Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          {loading && students.length === 0 ? (
            <div className="py-24 text-center">
              <Loader2 className="h-8 w-8 text-navy-primary animate-spin inline-block" />
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
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Remaining Balance</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((item) => {
                    const studentId = item.studentId;
                    const fullName = item.fullName;
                    const registrationNumber = item.registrationNumber;
                    const classIdName = item.classId?.name || 'N/A';
                    const sectionIdName = item.sectionId?.name || 'N/A';
                    
                    const feeRecord = item.feeRecord || {
                      amountDue: 0,
                      amountPaid: 0,
                      status: 'pending'
                    };
                    const remaining = Math.max(0, feeRecord.amountDue - feeRecord.amountPaid);
                    const badgeProps = getFeeBadgeProps(feeRecord.status);
                    
                    const isDownloading = !!downloadingIds[studentId];

                    return (
                      <tr key={studentId} className="hover:bg-gray-50/50 transition-colors">
                        {/* Profile Info */}
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-navy-950">{fullName}</div>
                            <div className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                              Reg: {registrationNumber}
                            </div>
                          </div>
                        </td>

                        {/* Class/Section */}
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-semibold text-gray-700 text-sm">{classIdName}</div>
                            <div className="text-xxs text-gray-400 font-semibold mt-0.5">Sec: {sectionIdName}</div>
                          </div>
                        </td>

                        {/* Amount Due */}
                        <td className="py-4 px-6 text-right font-bold text-navy-950 text-sm">
                          Rs. {feeRecord.amountDue.toLocaleString()}
                        </td>

                        {/* Amount Paid */}
                        <td className="py-4 px-6 text-right font-bold text-emerald-600 text-sm">
                          Rs. {feeRecord.amountPaid.toLocaleString()}
                        </td>

                        {/* Remaining Balance */}
                        <td className={`py-4 px-6 text-right font-black text-sm ${
                          remaining > 0 
                            ? feeRecord.status === 'partial' ? 'text-amber-500' : 'text-rose-600'
                            : 'text-gray-400'
                        }`}>
                          Rs. {remaining.toLocaleString()}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6">
                          <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Pay button (disabled if fully paid) */}
                            {feeRecord.status !== 'paid' ? (
                              <button
                                onClick={() => handleOpenWalletModal(item)}
                                title="Record Payment"
                                className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                              >
                                <CreditCard className="h-4.5 w-4.5" />
                              </button>
                            ) : (
                              <div className="p-2 text-gray-300 cursor-not-allowed">
                                <CreditCard className="h-4.5 w-4.5" />
                              </div>
                            )}

                            {/* Ledger history button */}
                            <button
                              onClick={() => handleOpenLedger(item)}
                              title="View Ledger"
                              className="p-2 text-navy-primary hover:bg-slate-100 rounded-xl transition-all"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>

                            {/* Download PDF receipt */}
                            <button
                              onClick={() => handleDownloadReceipt(item)}
                              title="Download PDF Receipt"
                              disabled={isDownloading}
                              className="p-2 text-gray-500 hover:text-navy-primary hover:bg-slate-100 rounded-xl transition-all disabled:opacity-40"
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                              ) : (
                                <FileText className="h-4.5 w-4.5" />
                              )}
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
              <p className="text-sm text-gray-400 italic">No matching monthly fee records found.</p>
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

      {/* Wallet Payment Modal */}
      <WalletPaymentModal
        isOpen={isWalletModalOpen}
        feeRecord={selectedStudent?.feeRecord}
        studentName={selectedStudent?.fullName}
        onSuccess={fetchData}
        onClose={() => {
          setIsWalletModalOpen(false);
          setSelectedStudent(null);
        }}
      />

      {/* Student Ledger Panel Drawer */}
      <StudentLedgerDrawer
        isOpen={isLedgerOpen}
        studentId={selectedStudent?.studentId}
        studentName={selectedStudent?.fullName}
        onClose={() => {
          setIsLedgerOpen(false);
          setSelectedStudent(null);
          fetchData(); // refresh parent table to update setting/status
        }}
      />

    </DashboardLayout>
  );
};

export default AdminFees;
