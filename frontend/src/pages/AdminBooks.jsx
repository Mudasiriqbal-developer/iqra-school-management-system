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
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  PlusCircle,
  FileText,
  Loader2,
  PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import {
  getBookSummary,
  getBookDues,
  downloadBookReceipt,
  getClasses,
  getSectionsByClass
} from '../features/books/bookService';

import RecordBookPaymentModal from '../features/books/RecordBookPaymentModal';
import IssueBookModal from '../features/books/IssueBookModal';
import BookDetailsModal from '../features/books/BookDetailsModal';

const AdminBooks = () => {
  // Navigation sidebar configuration
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Family Tree', icon: Users, path: '/admin/family' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Books Management', icon: BookOpen, path: '/admin/books' },
    { label: 'Expense Tracker', icon: TrendingUp, path: '/admin/expenses' },
    { label: 'Salary Payroll', icon: DollarSign, path: '/admin/payroll' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  // State Management
  const [summary, setSummary] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    pendingCount: 0,
    partialCount: 0,
    paidCount: 0,
    totalCount: 0
  });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Filters
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState('all');

  const handleOpenDetailsModal = (type) => {
    setDetailsModalType(type);
    setIsDetailsModalOpen(true);
  };

  // Load Classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await getClasses();
        if (res.success && Array.isArray(res.data)) {
          setClasses(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, []);

  // Load Sections when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }
    const fetchSections = async () => {
      try {
        const res = await getSectionsByClass(selectedClassId);
        if (res.success && Array.isArray(res.data)) {
          setSections(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSections();
  }, [selectedClassId]);

  // Fetch Summary KPIs
  const loadSummary = useCallback(async () => {
    try {
      const res = await getBookSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch Roster Data
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getBookDues({
        page,
        limit: 10,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined
      });

      if (res.success) {
        setRecords(res.data.records || []);
        setPages(res.data.pages || 1);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load book records');
    } finally {
      setLoading(false);
    }
  }, [page, selectedClassId, selectedSectionId, statusFilter, searchQuery]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Actions
  const handleOpenPayment = (record) => {
    setSelectedRecord(record);
    setIsPaymentModalOpen(true);
  };

  const handleDownloadReceipt = async (record) => {
    if (downloadingId) return;
    try {
      setDownloadingId(record._id);
      const studentName = record.student?.fullName || 'student';
      const regNo = record.student?.registrationNumber || record._id;
      await downloadBookReceipt(record._id, `${regNo}-${studentName.replace(/\s+/g, '_')}-book-receipt.pdf`);
      toast.success('Book receipt downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePaymentSuccess = () => {
    loadSummary();
    loadRecords();
  };

  return (
    <DashboardLayout subtitle="Books Management & Dues" navItems={navItems}>
      <div className="space-y-6 pb-12">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 p-6 rounded-3xl text-white shadow-xl shadow-navy-950/10 border border-white/5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="h-10 w-10 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-300 border border-sky-400/30">
                <BookOpen className="h-5 w-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Books & Syllabus Management</h1>
            </div>
            <p className="text-xs text-slate-300 pl-1">
              Track curriculum sets, student dues, issue book packages, and record payments with receipt generation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-700/20"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Issue Book Charge</span>
            </button>
            <button
              onClick={() => {
                loadSummary();
                loadRecords();
              }}
              title="Refresh Data"
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 active:rotate-180 duration-300"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Book Billing"
            value={`Rs. ${(summary.totalBilled || 0).toLocaleString()}`}
            icon={BookOpen}
            trend={`${summary.totalCount || 0} Total Records`}
            trendColor="info"
            onClick={() => handleOpenDetailsModal('all')}
          />

          <StatCard
            label="Collected Book Dues"
            value={`Rs. ${(summary.totalCollected || 0).toLocaleString()}`}
            icon={DollarSign}
            trend={`${summary.paidCount || 0} Paid Records`}
            trendColor="active"
            onClick={() => handleOpenDetailsModal('collected')}
          />

          <StatCard
            label="Partial Book Dues"
            value={`Rs. ${(summary.partialRemaining || 0).toLocaleString()}`}
            icon={Clock}
            trend={`${summary.partialCount || 0} Partial Students`}
            trendColor="pending"
            onClick={() => handleOpenDetailsModal('partial')}
          />

          <StatCard
            label="Remaining Unpaid Dues"
            value={`Rs. ${(summary.pendingAmount !== undefined && summary.pendingAmount > 0 ? summary.pendingAmount : (summary.totalOutstanding || 0)).toLocaleString()}`}
            icon={AlertCircle}
            trend={`${summary.pendingCount || 0} Unpaid Students`}
            trendColor="danger"
            onClick={() => handleOpenDetailsModal('pending')}
          />
        </div>

        {/* Roster Container */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search student name or registration #..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 shadow-sm"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Class Filter */}
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>{cls.name}</option>
                ))}
              </select>

              {/* Section Filter */}
              <select
                value={selectedSectionId}
                onChange={(e) => {
                  setSelectedSectionId(e.target.value);
                  setPage(1);
                }}
                disabled={!selectedClassId}
                className="px-3 py-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>{sec.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              >
                <option value="all">All Payment Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-6">Student Information</th>
                  <th className="p-3.5">Class / Section</th>
                  <th className="p-3.5">Package / Items</th>
                  <th className="p-3.5 text-right">Total Due</th>
                  <th className="p-3.5 text-right">Amount Paid</th>
                  <th className="p-3.5 text-right">Balance</th>
                  <th className="p-3.5 text-center">Payment Status</th>
                  <th className="p-3.5 text-center">Due Date</th>
                  <th className="p-3.5 text-center pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-slate-400 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-navy-900 dark:text-sky-400" />
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Loading book dues records...</span>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-slate-400 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">No book fee records found</span>
                        <p className="text-xs text-slate-400 dark:text-slate-400">Try changing the search filter or issue a new book charge.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const student = record.student;
                    const remaining = Math.max(0, (record.amount || 0) - (record.amountPaid || 0));
                    const isFullyPaid = record.paymentStatus === 'paid' || remaining <= 0;
                    const itemsLabel = record.items && record.items.length > 0
                      ? record.items.map((i) => i.title).join(', ')
                      : 'Course Books Set';

                    return (
                      <tr key={record._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/60 transition-colors">
                        {/* Student Info */}
                        <td className="p-3.5 pl-6">
                          <div className="flex items-center space-x-3">
                            <div className="h-9 w-9 rounded-xl bg-navy-50 dark:bg-sky-950/40 text-navy-900 dark:text-sky-300 font-bold flex items-center justify-center text-xs border border-navy-100 dark:border-sky-800/40 uppercase">
                              {student?.fullName?.charAt(0) || 'S'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-navy-950 dark:text-slate-100 block truncate max-w-[160px]">
                                {student?.fullName || 'N/A'}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                                Reg: <span className="font-semibold text-slate-600 dark:text-slate-300">{student?.registrationNumber || 'N/A'}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Class & Section */}
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-200">
                          {student?.classId?.name || record.classId?.name || 'Class'}
                          <span className="text-slate-400 dark:text-slate-400 font-medium ml-1">
                            {student?.sectionId?.name ? `(${student.sectionId.name})` : ''}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium max-w-[180px] truncate" title={itemsLabel}>
                          {itemsLabel}
                        </td>

                        {/* Total Due */}
                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-slate-100">
                          Rs. {(record.amount || 0).toLocaleString()}
                        </td>

                        {/* Paid */}
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                          Rs. {(record.amountPaid || 0).toLocaleString()}
                        </td>

                        {/* Balance */}
                        <td className="p-3.5 text-right font-black">
                          <span className={remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-400'}>
                            Rs. {remaining.toLocaleString()}
                          </span>
                        </td>

                        {/* Payment Status Badge */}
                        <td className="p-3.5 text-center">
                          <StatusBadge 
                            status={record.paymentStatus || 'pending'} 
                            label={record.paymentStatus ? (record.paymentStatus.charAt(0).toUpperCase() + record.paymentStatus.slice(1)) : 'Pending'} 
                          />
                        </td>

                        {/* Due Date */}
                        <td className="p-3.5 text-center text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                          {record.dueDate ? new Date(record.dueDate).toISOString().split('T')[0] : '—'}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 text-center pr-6">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Pay Button */}
                            <button
                              onClick={() => handleOpenPayment(record)}
                              disabled={isFullyPaid}
                              title={isFullyPaid ? 'Fully Paid' : 'Record Payment'}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                isFullyPaid
                                  ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                  : 'bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm shadow-navy-950/20 active:scale-95'
                              }`}
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>{isFullyPaid ? 'Paid' : 'Pay'}</span>
                            </button>

                            {/* Download Receipt Button */}
                            <button
                              onClick={() => handleDownloadReceipt(record)}
                              disabled={downloadingId === record._id}
                              title="Download PDF Receipt"
                              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                            >
                              {downloadingId === record._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-navy-900 dark:text-sky-400" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-150 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>
              Showing <span className="font-bold text-slate-800 dark:text-slate-100">{records.length}</span> of{' '}
              <span className="font-bold text-slate-800 dark:text-slate-100">{total}</span> records
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="font-bold text-slate-700 dark:text-slate-200 px-1">
                Page {page} of {pages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <RecordBookPaymentModal
          isOpen={isPaymentModalOpen}
          record={selectedRecord}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedRecord(null);
          }}
          onSuccess={handlePaymentSuccess}
        />

        <IssueBookModal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          onSuccess={() => {
            loadSummary();
            loadRecords();
          }}
        />

        <BookDetailsModal
          isOpen={isDetailsModalOpen}
          type={detailsModalType}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminBooks;
