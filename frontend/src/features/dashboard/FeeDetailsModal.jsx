import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, AlertCircle, Info } from 'lucide-react';
import api from '../../services/api';

const FeeDetailsModal = ({ isOpen, type, onClose }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const limit = 6; // Set a small limit so pagination is visible and easily testable

  const fetchData = async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = type === 'collected' ? '/fees/collected-students' : '/fees/partial-students';
      const res = await api.get(endpoint, {
        params: { page, limit }
      });
      
      if (res.data?.success) {
        setStudents(res.data.data.students || []);
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
  };

  // Fetch data on open or page change
  useEffect(() => {
    fetchData();
  }, [isOpen, type, page]);

  // Reset page when modal opens or toggles type
  useEffect(() => {
    setPage(1);
    setStudents([]);
  }, [isOpen, type]);

  if (!isOpen) return null;

  const isCollectedType = type === 'collected';
  const modalTitle = isCollectedType ? 'Collected Fees Details' : 'Partial Payments Dues';

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('default', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
    <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-150 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="relative bg-navy-900 px-6 py-5 text-white flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{modalTitle}</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isCollectedType 
                ? 'Overview of students who have made payments during this month/period.' 
                : 'Overview of students with partial payments, sorted by outstanding balance descending.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
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
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Class / Section</th>
                    {isCollectedType ? (
                      <>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount Paid</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total Due</th>
                      </>
                    ) : (
                      <>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total Due</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount Paid</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Remaining Due</th>
                      </>
                    )}
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Payment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((item) => (
                    <tr key={item.studentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 text-sm font-bold text-navy-950">{item.name}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-500">
                        {item.class} - {item.section}
                      </td>
                      {isCollectedType ? (
                        <>
                          <td className="py-4 px-6 text-sm font-bold text-emerald-600 text-right">
                            Rs. {item.amountPaid.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-gray-500 text-right">
                            Rs. {item.totalDue.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-6 text-sm font-semibold text-gray-500 text-right">
                            Rs. {item.totalDue.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm font-bold text-emerald-600 text-right">
                            Rs. {item.amountPaid.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm font-black text-rose-600 text-right">
                            Rs. {item.remainingDue.toLocaleString()}
                          </td>
                        </>
                      )}
                      <td className="py-4 px-6 text-sm text-gray-400 font-semibold">
                        {formatDate(item.lastPaymentDate)}
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
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              Showing {students.length} of {totalCount} Record(s)
            </span>

            <div className="flex items-center space-x-2">
              {/* Prev Button */}
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="p-2 border border-gray-200 rounded-xl bg-white text-gray-700 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1.5 text-xs font-bold text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
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
