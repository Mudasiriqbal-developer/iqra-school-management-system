import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  BookOpen,
  DollarSign,
  Info,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/shared/StatusBadge';
import { getBookDues, downloadBookReceipt, downloadBookReportPDF } from './bookService';

const BookDetailsModal = ({ isOpen, type, onClose }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);

  const limit = 8; // Number of items per page in popup

  // Header configuration based on type
  const getModalConfig = () => {
    switch (type) {
      case 'collected':
        return {
          title: 'Collected Book Dues',
          subtitle: 'Students with realized cash & online book payments',
          icon: DollarSign,
          badgeLabel: 'Paid / Collected',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          reportFilePrefix: 'collected-books-report'
        };
      case 'partial':
        return {
          title: 'Partial Book Dues',
          subtitle: 'Students with partial payments and remaining balances',
          icon: Clock,
          badgeLabel: 'Partially Paid',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          reportFilePrefix: 'partial-books-report'
        };
      case 'pending':
      case 'remaining':
        return {
          title: 'Remaining Unpaid Book Dues',
          subtitle: 'Students who have not yet paid their book packages',
          icon: AlertCircle,
          badgeLabel: 'Unpaid / Pending',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          reportFilePrefix: 'unpaid-books-report'
        };
      case 'all':
      default:
        return {
          title: 'Total Book Invoices',
          subtitle: 'Complete roster of student book billing and packages',
          icon: BookOpen,
          badgeLabel: 'All Records',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          reportFilePrefix: 'all-books-report'
        };
    }
  };

  const config = getModalConfig();

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!isOpen || !type) return;
    try {
      setLoading(true);
      setError(null);

      const res = await getBookDues({
        page,
        limit,
        status: type,
        search: searchQuery.trim() || undefined
      });

      if (res.success && res.data) {
        setRecords(res.data.records || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        throw new Error(res.message || 'Failed to retrieve book records');
      }
    } catch (err) {
      console.error('Error fetching book detail modal records:', err);
      setError(err.response?.data?.message || err.message || 'Error loading records.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, type, page, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page and search when modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSearchQuery('');
      setRecords([]);
      setError(null);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  // Compute live view metrics from current page records
  const currentTotalBilled = records.reduce((sum, r) => sum + (r.amount || 0), 0);
  const currentTotalCollected = records.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const currentTotalRemaining = Math.max(0, currentTotalBilled - currentTotalCollected);

  // Download PDF Report for the entire filter
  const handleDownloadReportPDF = async () => {
    if (downloadingReport) return;
    try {
      setDownloadingReport(true);
      const filename = `${config.reportFilePrefix}-${new Date().toISOString().split('T')[0]}.pdf`;
      await downloadBookReportPDF(
        {
          type,
          search: searchQuery.trim() || undefined
        },
        filename
      );
      toast.success('Book report PDF downloaded successfully');
    } catch (err) {
      console.error('Error downloading book report PDF:', err);
      toast.error('Failed to generate book report PDF');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Download individual student receipt
  const handleDownloadSingleReceipt = async (record) => {
    if (downloadingReceiptId) return;
    try {
      setDownloadingReceiptId(record._id);
      const studentName = record.student?.fullName || 'student';
      const regNo = record.student?.registrationNumber || record._id;
      const filename = `${regNo}-${studentName.replace(/\s+/g, '_')}-receipt.pdf`;
      await downloadBookReceipt(record._id, filename);
      toast.success('Student receipt downloaded');
    } catch (err) {
      console.error('Error downloading student receipt:', err);
      toast.error('Failed to download student receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // Refresh records
  const handleRefresh = async () => {
    try {
      await fetchData();
      toast.success('Records refreshed');
    } catch {
      toast.error('Failed to refresh records');
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

  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Branded Navy Header */}
        <div className="relative bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 border-b border-white/10">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 text-white flex-shrink-0">
              <IconComponent className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h2 className="text-lg md:text-xl font-black tracking-tight">{config.title}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeColor}`}>
                  {config.badgeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{config.subtitle}</p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:rotate-180 disabled:opacity-50 transition-all text-white focus:outline-none cursor-pointer duration-300"
              title="Refresh popup records"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-sky-400' : 'text-white'}`} />
            </button>

            <button
              onClick={handleDownloadReportPDF}
              disabled={downloadingReport || loading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/30 cursor-pointer"
              title="Download official PDF report for these records"
            >
              {downloadingReport ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Download className="h-4 w-4 text-white" />
              )}
              <span>{downloadingReport ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white focus:outline-none cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Financial Ribbon */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          {/* Search Input & Refresh Button */}
          <div className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student name or registration #..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh list"
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 rounded-xl shadow-xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            </button>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
            <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Students</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100">{totalCount}</span>
            </div>

            <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Page Billed</span>
              <span className="font-extrabold text-sky-600 dark:text-sky-400">Rs. {currentTotalBilled.toLocaleString()}</span>
            </div>

            <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Page Paid</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Rs. {currentTotalCollected.toLocaleString()}</span>
            </div>

            <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Page Remaining</span>
              <span className={`font-extrabold ${currentTotalRemaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                Rs. {currentTotalRemaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="m-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && records.length === 0 ? (
            <div className="p-6 space-y-3">
              <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse w-full" />
              {[...Array(limit)].map((_, idx) => (
                <div key={idx} className="h-14 bg-slate-50 dark:bg-slate-850 rounded-xl animate-pulse w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <Info className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No records found</p>
              <p className="text-xs text-slate-400 max-w-sm">
                There are no matching book fee entries in this category {searchQuery ? `for "${searchQuery}"` : ''}.
              </p>
            </div>
          ) : (
            /* Data Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px] text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-3.5 px-5">Student Information</th>
                    <th className="py-3.5 px-4">Class / Section</th>
                    <th className="py-3.5 px-4">Package / Items</th>
                    <th className="py-3.5 px-4 text-right">Total Due</th>
                    <th className="py-3.5 px-4 text-right">Amount Paid</th>
                    <th className="py-3.5 px-4 text-right">Remaining Due</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((item) => {
                    const studentName = item.student?.fullName || 'Unknown Student';
                    const regNo = item.student?.registrationNumber || 'N/A';
                    const className = item.student?.classId?.name || item.classId?.name || 'Class';
                    const sectionName = item.student?.sectionId?.name || 'A';
                    const itemsSummary = item.items && item.items.length > 0
                      ? item.items.map(i => i.title).join(', ')
                      : 'Standard Curriculum Package';
                    const totalDue = item.amount || 0;
                    const amountPaid = item.amountPaid || 0;
                    const remainingBalance = Math.max(0, totalDue - amountPaid);
                    const isDownloadingThisReceipt = downloadingReceiptId === item._id;

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Student Name & Reg */}
                        <td className="py-3 px-5">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-100 dark:border-sky-900/40 flex-shrink-0">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 block leading-snug">
                                {studentName}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 block">
                                Reg: {regNo}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Class / Section */}
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {className} <span className="text-slate-400">({sectionName})</span>
                        </td>

                        {/* Package / Items */}
                        <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-300 font-medium truncate" title={itemsSummary}>
                          {itemsSummary}
                        </td>

                        {/* Total Due */}
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          Rs. {totalDue.toLocaleString()}
                        </td>

                        {/* Amount Paid */}
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          Rs. {amountPaid.toLocaleString()}
                        </td>

                        {/* Remaining Due */}
                        <td className="py-3 px-4 text-right">
                          <span className={`font-black ${remainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                            Rs. {remainingBalance.toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <StatusBadge
                            status={item.paymentStatus === 'paid' ? 'success' : item.paymentStatus === 'partial' ? 'warning' : 'danger'}
                            label={item.paymentStatus}
                          />
                        </td>

                        {/* Actions (Direct receipt download) */}
                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => handleDownloadSingleReceipt(item)}
                            disabled={isDownloadingThisReceipt}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-navy-950 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Download student payment receipt"
                          >
                            {isDownloadingThisReceipt ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {!loading && records.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Showing {records.length} of {totalCount} Record(s)
            </span>

            <div className="flex items-center space-x-1.5">
              {/* Prev Button */}
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-xs font-bold text-slate-400">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                        page === p
                          ? 'bg-navy-900 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
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
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
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

export default BookDetailsModal;
