import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  DollarSign,
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Pencil,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOneTimeCharges, getClasses, getSectionsByClass, deleteOneTimeCharge, updateOneTimeCharge } from './feeService';
import StatusBadge from '../../components/shared/StatusBadge';
import ConfirmModal from '../../components/shared/ConfirmModal';
import RecordPaymentModal from './RecordPaymentModal';
import IssueChargeModal from './IssueChargeModal';

const OneTimeChargesView = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    pendingCount: 0,
    partialCount: 0,
    paidCount: 0,
    totalCount: 0
  });

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals & loading states
  const [loading, setLoading] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [paymentModalRecord, setPaymentModalRecord] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirm Delete Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Fetch classes on mount
  useEffect(() => {
    const fetchClassesList = async () => {
      try {
        const res = await getClasses();
        if (res.success && Array.isArray(res.data)) {
          setClasses(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClassesList();
  }, []);

  // Fetch sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }
    const fetchSectionsList = async () => {
      try {
        const res = await getSectionsByClass(selectedClassId);
        if (res.success && Array.isArray(res.data)) {
          setSections(res.data);
          setSelectedSectionId('');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSectionsList();
  }, [selectedClassId]);

  // Fetch charges report
  const fetchCharges = async () => {
    try {
      setLoading(true);
      const params = {
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        title: titleFilter.trim() || undefined,
        page,
        limit: 15
      };

      const res = await getOneTimeCharges(params);
      if (res.success) {
        setRecords(res.data?.records || []);
        setSummary(res.data?.summary || {});
        setPages(res.data?.pages || 1);
        setTotal(res.data?.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load one-time charges report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, [selectedClassId, selectedSectionId, statusFilter, page]);

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCharges();
  };

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    if (record.amountPaid > 0) {
      toast.error('Cannot edit this charge: payments have already been collected against it.');
      return;
    }
    setEditingRecord(record);
    setEditTitle(record.title || '');
    setEditAmount(record.amountDue || '');
    setEditDueDate(record.dueDate ? new Date(record.dueDate).toISOString().split('T')[0] : '');
  };

  // Submit Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await updateOneTimeCharge(editingRecord._id, {
        title: editTitle.trim(),
        amountDue: numAmount,
        dueDate: editDueDate || null
      });

      if (res.success) {
        toast.success('One-time charge updated successfully');
        setEditingRecord(null);
        fetchCharges();
      } else {
        toast.error(res.message || 'Failed to update charge');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error updating charge');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete
  const handleDelete = (record) => {
    if (record.amountPaid > 0) {
      toast.error('Cannot delete this charge: payments have already been collected.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Void / Delete One-Time Charge',
      message: `Are you sure you want to delete the "${record.title || 'One-Time Charge'}" of Rs. ${record.amountDue} for ${record.studentId?.fullName || 'this student'}? This cannot be undone.`,
      confirmText: 'Delete Charge',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteOneTimeCharge(record._id);
          if (res.success) {
            toast.success('Charge deleted successfully');
            fetchCharges();
          } else {
            toast.error(res.message || 'Failed to delete charge');
          }
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || 'Server error deleting charge');
        }
      }
    });
  };

  const getBadgeProps = (status) => {
    switch (status) {
      case 'paid':
        return { status: 'success', label: 'Paid in Full' };
      case 'partial':
        return { status: 'warning', label: 'Partial Paid' };
      case 'pending':
      default:
        return { status: 'pending', label: 'Unpaid / Pending' };
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider rounded-md border border-purple-100 dark:border-purple-800/40">
              Occasional & Special Fees
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1 tracking-tight text-slate-900 dark:text-slate-100">Outstanding One-Time Charges</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Track exam fees, paper funds, activity charges, and special levies issued separately from monthly tuition.
          </p>
        </div>
        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Issue New Charge</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Billed</span>
            <div className="p-2 bg-navy-50/80 dark:bg-sky-950/40 text-navy-950 dark:text-sky-400 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            Rs. {Number(summary.totalBilled || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Across <strong>{summary.totalCount || 0}</strong> issued charges
          </p>
        </div>

        {/* Total Collected */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Collected</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            Rs. {Number(summary.totalCollected || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-semibold mt-1">
            <strong>{summary.paidCount || 0}</strong> fully cleared
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outstanding Dues</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            Rs. {Number(summary.totalOutstanding || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 font-semibold mt-1">
            <strong>{summary.pendingCount || 0}</strong> pending • <strong>{summary.partialCount || 0}</strong> partial
          </p>
        </div>

        {/* Target Coverage */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collection Rate</span>
            <div className="p-2 bg-navy-50/80 dark:bg-sky-950/40 text-navy-950 dark:text-sky-400 rounded-xl">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-navy-900 dark:text-sky-400 mt-2">
            {summary.totalBilled > 0
              ? `${Math.round((summary.totalCollected / summary.totalBilled) * 100)}%`
              : '0%'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Recovery progress
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, roll no, charge title..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.gender && c.gender !== 'mixed' ? `(${c.gender})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setPage(1);
              }}
              disabled={!selectedClassId}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50"
            >
              <option value="">All Sections</option>
              {sections.map(s => (
                <option key={s._id} value={s._id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending / Unpaid</option>
              <option value="partial">Partial Paid</option>
              <option value="paid">Paid in Full</option>
            </select>
          </div>

        </form>
      </div>

      {/* Charges Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">Student Details</th>
                <th className="px-4 py-3.5">Class / Section</th>
                <th className="px-4 py-3.5">Charge Title & Due Date</th>
                <th className="px-4 py-3.5 text-right">Amt Due</th>
                <th className="px-4 py-3.5 text-right">Amt Paid</th>
                <th className="px-4 py-3.5 text-right">Remaining</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Loading one-time charges...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No one-time charges found</p>
                      <p className="text-[11px] text-slate-400">
                        Use the "Issue New Charge" button above to assign exam fees or activity funds to students.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const student = r.studentId;
                  const remaining = Math.max(0, r.amountDue - r.amountPaid);
                  const badge = getBadgeProps(r.status);
                  const isLocked = r.amountPaid > 0;

                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      {/* Student Info */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {student?.fullName || 'Unknown Student'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Reg: <span className="font-semibold text-slate-600 dark:text-slate-300">{student?.registrationNumber || 'N/A'}</span>
                          {student?.fatherName ? ` • Father: ${student.fatherName}` : ''}
                        </div>
                      </td>

                      {/* Class / Section */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {student?.classId?.name || 'N/A'}
                        {student?.sectionId?.name ? ` / Sec ${student.sectionId.name}` : ''}
                      </td>

                      {/* Title & Due Date */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/40 text-xs">
                          {r.title || 'One-Time Charge'}
                        </span>
                        {r.dueDate && (
                          <div className="text-[10px] text-slate-400 font-medium flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                            Due: {new Date(r.dueDate).toISOString().split('T')[0]}
                          </div>
                        )}
                      </td>

                      {/* Amount Due */}
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        Rs. {r.amountDue.toLocaleString()}
                      </td>

                      {/* Amount Paid */}
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {r.amountPaid.toLocaleString()}
                      </td>

                      {/* Remaining */}
                      <td className="px-4 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        Rs. {remaining.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={badge.status} label={badge.label} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {r.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setPaymentModalRecord(r);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/40 text-[11px] transition-colors"
                            >
                              Collect
                            </button>
                          )}

                          {/* Edit Button (Disabled if locked) */}
                          <button
                            onClick={() => handleOpenEdit(r)}
                            disabled={isLocked}
                            title={isLocked ? 'Locked: Payment recorded against this charge' : 'Edit Charge'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isLocked
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                          </button>

                          {/* Delete Button (Disabled if locked) */}
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={isLocked}
                            title={isLocked ? 'Locked: Payment recorded against this charge' : 'Delete Charge'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isLocked
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-slate-200 dark:border-slate-700 hover:border-rose-200'
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
        {pages > 1 && (
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">
              Showing page <strong>{page}</strong> of <strong>{pages}</strong> ({total} total records)
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(prev => Math.min(pages, prev + 1))}
                disabled={page >= pages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Issue Charge Modal */}
      <IssueChargeModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={() => {
          fetchCharges();
        }}
      />

      {/* Record Payment Modal */}
      {paymentModalRecord && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          feeRecord={paymentModalRecord}
          studentName={paymentModalRecord.studentId?.fullName || 'Student'}
          onSuccess={() => {
            fetchCharges();
          }}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentModalRecord(null);
          }}
        />
      )}

      {/* Edit One-Time Charge Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-navy-primary px-5 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold">Edit One-Time Charge</h3>
                <p className="text-[10px] text-slate-300">For {editingRecord.studentId?.fullName}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-white/80 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Charge Title / Reason
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Amount Due (Rs.)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
                >
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || 'Confirm'}
        type={confirmModal.type || 'danger'}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

export default OneTimeChargesView;
