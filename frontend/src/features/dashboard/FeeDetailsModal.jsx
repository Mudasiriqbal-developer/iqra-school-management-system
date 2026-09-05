import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  RefreshCw,
  Search,
  FileDown,
  Receipt,
  Loader2,
  Users,
  Wallet,
  CheckCircle2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  downloadStudentReceiptPDF,
  downloadBatchAuditPDF
} from './dashboardService';

const FeeDetailsModal = ({ isOpen, type, onClose }) => {
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [downloadingBatch, setDownloadingBatch] = useState(false);

  const limit = 6;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      setError(null);

      const endpoint =
        type === 'collected'
          ? '/fees/collected-students'
          : type === 'partial'
          ? '/fees/partial-students'
          : '/fees/remaining-students';
      const params = { page, limit };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const res = await api.get(endpoint, { params });

      if (res.data?.success) {
        setStudents(res.data.data.students || []);
        setSummary(res.data.data.summary || null);
        setTotalPages(res.data.data.pages || 1);
        setTotalCount(res.data.data.total || 0);
      } else {
        throw new Error(res.data?.message || 'Failed to retrieve fee records.');
      }
    } catch (err) {
      console.error('Error fetching modal records:', err);
      setError(err.response?.data?.message || err.message || 'Error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, type, page, debouncedSearch]);

  // Fetch data on open, page change, or debounced search change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page and search when modal opens or toggles type
  useEffect(() => {
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setStudents([]);
    setSummary(null);
  }, [isOpen, type]);

  if (!isOpen) return null;

  const isCollectedType = type === 'collected';
  const isPartialType = type === 'partial';
  const modalTitle = isCollectedType
    ? 'Collected Fees Drill-Down'
    : isPartialType
    ? 'Partial Payments Dues Drill-Down'
    : 'Remaining Fee Dues Drill-Down';

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('default', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Row-level instant receipt download
  const handleDownloadReceipt = async (student) => {
    try {
      setDownloadingReceiptId(student.studentId);
      await downloadStudentReceiptPDF(student.studentId, student.registrationNumber);
      toast.success(`Receipt downloaded for ${student.name}`);
    } catch (err) {
      console.error('Error downloading receipt:', err);
      toast.error('Failed to download student receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // Batch PDF audit report export
  const handleExportBatchPDF = async () => {
    try {
      setDownloadingBatch(true);
      toast.loading('Generating batch audit PDF report...', { id: 'batch-pdf' });
      await downloadBatchAuditPDF(type, debouncedSearch);
      toast.success('Batch audit PDF downloaded successfully!', { id: 'batch-pdf' });
    } catch (err) {
      console.error('Error downloading batch audit report:', err);
      toast.error('Failed to generate audit report', { id: 'batch-pdf' });
    } finally {
      setDownloadingBatch(false);
    }
  };

  // Pagination helper
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-150 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="relative bg-navy-900 px-6 py-4 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-3 flex-shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold tracking-tight">{modalTitle}</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/15 text-blue-200 border border-white/20">
                Actionable Drill-Down
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isCollectedType 
                ? 'Student-by-student ledger of confirmed fee collections for the current active period.' 
                : isPartialType
                ? 'Prioritized arrears ledger sorted by outstanding balance descending.'
                : 'Complete roster of all students with outstanding balances (pending and partial) for the current active period.'}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2 self-end sm:self-auto flex-wrap">
            {/* Refresh Icon Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh popup window data"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center space-x-1.5 text-xs font-semibold focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-300' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            {/* Full Batch PDF Report Button */}
            <button
              onClick={handleExportBatchPDF}
              disabled={downloadingBatch || loading}
              title="Download full batch PDF audit report"
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center space-x-1.5 text-xs font-bold shadow-xs focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {downloadingBatch ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span>Batch Audit PDF</span>
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Financial Ribbon */}
        <div className="bg-slate-50 border-b border-gray-200/80 px-6 py-3 flex-shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Students */}
            <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Students</span>
                <span className="text-base font-extrabold text-navy-950">
                  {summary ? summary.totalStudents.toLocaleString() : totalCount}
                </span>
              </div>
            </div>

            {/* Total Billed */}
            <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-navy-50 text-navy-900 rounded-lg">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Billed</span>
                <span className="text-base font-extrabold text-navy-950">
                  Rs. {(summary?.totalBilled || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Total Collected */}
            <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Collected</span>
                <span className="text-base font-extrabold text-emerald-700">
                  Rs. {(summary?.totalCollected || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Total Remaining */}
            <div className="bg-white p-3 rounded-xl border border-gray-200/70 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Remaining</span>
                <span className="text-base font-extrabold text-rose-600">
                  Rs. {(summary?.totalRemaining || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or registration number..."
              className="w-full pl-10 pr-9 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 text-navy-950 transition-all placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium hidden sm:block">
            {debouncedSearch ? (
              <span>Filtering for: <strong className="text-navy-900">"{debouncedSearch}"</strong></span>
            ) : (
              <span>Showing all active records</span>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          {/* Skeleton loading state */}
          {loading && students.length === 0 ? (
            <div className="p-6 space-y-4">
              <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-full" />
              <div className="space-y-2">
                {[...Array(limit)].map((_, idx) => (
                  <div key={idx} className="h-12 bg-gray-50 rounded-lg animate-pulse w-full" />
                ))}
              </div>
            </div>
          ) : students.length === 0 ? (
            /* Empty state */
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-gray-50 rounded-full">
                <Info className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-bold">No records yet</p>
              <p className="text-xs text-gray-400">There are no matching fee records to display for this period.</p>
            </div>
          ) : (
            /* Table Data */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Student Details</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Class / Sec</th>
                    {isCollectedType ? (
                      <>
                        <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount Paid</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total Due</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total Due</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount Paid</th>
                        <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Remaining Due</th>
                      </>
                    )}
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Payment</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((item) => (
                    <tr key={item.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-navy-950 text-sm">{item.name}</div>
                        <div className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {item.registrationNumber ? item.registrationNumber.toUpperCase() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-sm font-semibold text-gray-600">
                        {item.class} - {item.section}
                      </td>
                      {isCollectedType ? (
                        <>
                          <td className="py-3.5 px-6 text-sm font-bold text-emerald-600 text-right">
                            Rs. {item.amountPaid.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6 text-sm font-semibold text-gray-500 text-right">
                            Rs. {item.totalDue.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3.5 px-6 text-sm font-semibold text-gray-500 text-right">
                            Rs. {item.totalDue.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6 text-sm font-bold text-emerald-600 text-right">
                            Rs. {item.amountPaid.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6 text-sm font-black text-rose-600 text-right">
                            Rs. {item.remainingDue.toLocaleString()}
                          </td>
                        </>
                      )}
                      <td className="py-3.5 px-6 text-sm text-gray-400 font-semibold">
                        {formatDate(item.lastPaymentDate)}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleDownloadReceipt(item)}
                          disabled={downloadingReceiptId === item.studentId}
                          title={`Download official fee receipt for ${item.name}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-900 rounded-lg text-xs font-bold border border-navy-200/60 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {downloadingReceiptId === item.studentId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-navy-700" />
                          ) : (
                            <Receipt className="h-3.5 w-3.5 text-navy-700" />
                          )}
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {!loading && students.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50/60 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              Showing {students.length} of {totalCount} Record(s) {debouncedSearch ? '(Filtered)' : ''}
            </span>

            <div className="flex items-center space-x-2">
              {/* Prev Button */}
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="p-2 border border-gray-200 rounded-xl bg-white text-gray-700 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-xs font-bold text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        page === p
                          ? 'bg-navy-900 text-white shadow-xs'
                          : 'text-gray-700 bg-white border border-gray-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-2 border border-gray-200 rounded-xl bg-white text-gray-700 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FeeDetailsModal;
