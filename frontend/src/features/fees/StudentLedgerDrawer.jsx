import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Wallet, FileText, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { getStudentLedger, setMonthlyFee, downloadReceipt } from './feeService';
import { getStudentById } from '../students/studentService';
import StatusBadge from '../../components/shared/StatusBadge';
import { toast } from 'react-hot-toast';
import RecordPaymentModal from './RecordPaymentModal';

const StudentLedgerDrawer = ({ isOpen, studentId, studentName, onClose }) => {
  const [ledger, setLedger] = useState(null);
  const [student, setStudent] = useState(null);
  const [monthlyFeeAmount, setMonthlyFeeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({}); // e.g. { "2026-07": true }
  const [successNote, setSuccessNote] = useState('');
  const [selectedFeeRecord, setSelectedFeeRecord] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Fetch data on open or when studentId changes
  useEffect(() => {
    if (isOpen && studentId) {
      setLedger(null);
      setStudent(null);
      setMonthlyFeeAmount('');
      setExpandedMonths({});
      setSuccessNote('');
      fetchLedgerAndStudent();
    }
  }, [isOpen, studentId]);

  const fetchLedgerAndStudent = async () => {
    try {
      setLoading(true);
      // Fetch ledger
      const ledgerRes = await getStudentLedger(studentId);
      if (ledgerRes.success) {
        setLedger(ledgerRes.data);
      }
      
      // Fetch student details for registrationNumber and monthlyFeeAmount
      const studentRes = await getStudentById(studentId);
      if (studentRes.success) {
        setStudent(studentRes.data);
        setMonthlyFeeAmount(studentRes.data.monthlyFeeAmount || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ledger records');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleToggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  const handleRecordPayment = (record) => {
    setSelectedFeeRecord(record);
    setIsPaymentModalOpen(true);
  };

  const handleSaveMonthlyFee = async () => {
    const feeVal = parseFloat(monthlyFeeAmount);
    if (isNaN(feeVal) || feeVal < 0) {
      toast.error('Please enter a valid monthly fee amount');
      return;
    }

    try {
      setSavingFee(true);
      setSuccessNote('');
      const res = await setMonthlyFee(studentId, feeVal);
      if (res.success) {
        toast.success('Monthly fee updated successfully');
        setSuccessNote(res.message || "Monthly fee updated. This will apply starting next month — the current month's bill has already been set.");
        // Refresh student details
        const studentRes = await getStudentById(studentId);
        if (studentRes.success) {
          setStudent(studentRes.data);
        }
      } else {
        toast.error(res.message || 'Failed to update monthly fee');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred while saving monthly fee');
    } finally {
      setSavingFee(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      setDownloading(true);
      await downloadReceipt(studentId, studentName);
      toast.success('PDF Receipt downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF receipt');
    } finally {
      setDownloading(false);
    }
  };

  // Format Date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Format Month helper (YYYY-MM -> Month YYYY)
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get status badge props
  const getFeeBadgeProps = (feeStatus) => {
    switch (feeStatus) {
      case 'paid':
        return { status: 'active', label: 'Paid' };
      case 'partial':
        return { status: 'pending', label: 'Partial' }; // amber/pending style
      case 'pending':
        return { status: 'danger', label: 'Pending' };
      default:
        return { status: 'default', label: feeStatus || 'Unset' };
    }
  };

  const records = ledger?.records || [];
  const summary = ledger?.summary || { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
      
      {/* Backdrop click close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Sliding Panel */}
      <div className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col z-10 animate-slideLeft">
        
        {/* Drawer Header */}
        <div className="bg-navy-primary px-6 py-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-base font-bold tracking-tight">Student Fee Ledger</h2>
            <p className="text-xs text-slate-200 mt-0.5">{studentName}</p>
            {student && (
              <p className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase mt-1">
                Reg: {student.registrationNumber}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadReceipt}
              disabled={downloading || loading || records.length === 0}
              className="p-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-xl text-white transition-all flex items-center space-x-1.5 text-xs font-bold"
              title="Download PDF Receipt"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Receipt (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex flex-col justify-center items-center py-24">
              <Loader2 className="h-8 w-8 text-navy-primary animate-spin" />
              <p className="text-sm font-bold text-navy-950 mt-4">Loading ledger history...</p>
            </div>
          ) : (
            <>
              {/* Ledger Summary Stats */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl text-center shadow-sm">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Billed</span>
                  <span className="text-sm font-black text-navy-950">Rs. {summary.totalBilled.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Paid</span>
                  <span className="text-sm font-black text-emerald-600">Rs. {summary.totalPaid.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Outstanding</span>
                  <span className="text-sm font-black text-rose-600">Rs. {summary.totalOutstanding.toLocaleString()}</span>
                </div>
              </div>

              {/* Recurring Setting Block */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recurring Monthly Fee Amount (Rs.)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter recurring monthly amount"
                    value={monthlyFeeAmount}
                    onChange={(e) => setMonthlyFeeAmount(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                  />
                  <button
                    onClick={handleSaveMonthlyFee}
                    disabled={savingFee}
                    className="bg-navy-primary text-white font-bold py-2 px-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center space-x-1.5 text-xs disabled:opacity-50"
                  >
                    {savingFee ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save</span>
                  </button>
                </div>
                {successNote ? (
                  <p className="text-[10px] text-navy-primary font-semibold bg-navy-50/50 p-2.5 rounded-lg border border-navy-100 leading-normal">
                    {successNote}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                    Note: Changes will apply starting next month. The current month's bill remains unchanged.
                  </p>
                )}
              </div>

              {/* Transactions Month-by-Month List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center">
                  <Wallet className="h-4 w-4 mr-1.5 text-navy-primary" />
                  Monthly Billing History
                </h3>

                {records.length > 0 ? (
                  <div className="space-y-3">
                    {records.map((record) => {
                      const badge = getFeeBadgeProps(record.status);
                      const isExpanded = !!expandedMonths[record.month];
                      const remaining = Math.max(0, record.amountDue - record.amountPaid);
                      
                      return (
                        <div
                          key={record._id}
                          className={`border rounded-xl overflow-hidden shadow-sm ${
                            record.type === 'admission'
                              ? 'border-l-4 border-l-blue-500 border-gray-200/80'
                              : 'border-gray-200/80'
                          }`}
                        >
                          {/* Month Row */}
                          <div
                            onClick={() => handleToggleMonth(record.month)}
                            className="flex justify-between items-center p-4 bg-white hover:bg-slate-50/50 cursor-pointer select-none transition-colors"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-black text-navy-950 flex items-center">
                                {record.type === 'admission' ? 'Admission & Books Due' : formatMonth(record.month)}
                                {record.type === 'admission' && (
                                  <span className="ml-2 text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                                    One-Time
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center space-x-3 text-[10px] text-gray-500 font-semibold">
                                <span>Due: <strong className="text-navy-950">Rs. {record.amountDue}</strong></span>
                                <span>Paid: <strong className="text-emerald-600">Rs. {record.amountPaid}</strong></span>
                                {remaining > 0 && <span>Left: <strong className="text-rose-600">Rs. {remaining}</strong></span>}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {record.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRecordPayment(record);
                                  }}
                                  className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100 transition-colors"
                                >
                                  Record Payment
                                </button>
                              )}
                              <StatusBadge status={badge.status} label={badge.label} />
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Expandable Payments history */}
                          {isExpanded && (
                            <div className="bg-slate-50/60 border-t border-gray-100 p-4 space-y-2.5">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Payment Transactions</p>
                              {record.payments && record.payments.length > 0 ? (
                                <div className="space-y-2">
                                  {record.payments.map((p, idx) => (
                                    <div key={p._id || idx} className="flex justify-between items-center bg-white border border-gray-150 p-2.5 rounded-lg text-xs">
                                      <div>
                                        <p className="font-bold text-slate-800">Rs. {p.amount}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold capitalize">
                                          Type: {p.type} • Via: {p.method.replace('_', ' ')}
                                        </p>
                                      </div>
                                      <p className="text-[10px] text-slate-500 font-medium flex items-center">
                                        <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                        {formatDate(p.paidOn)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xxs text-gray-400 italic">No payments recorded for this month.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 italic">No fee records yet for this student.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-navy-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition-opacity focus:outline-none"
          >
            Close
          </button>
        </div>

      </div>

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        feeRecord={selectedFeeRecord}
        studentName={studentName}
        onSuccess={() => {
          fetchLedgerAndStudent();
        }}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedFeeRecord(null);
        }}
      />
    </div>
  );
};

export default StudentLedgerDrawer;
