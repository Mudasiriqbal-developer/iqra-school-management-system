import React, { useState, useEffect } from 'react';
import { X, Calendar, Wallet, FileText, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { getStudentLedger, downloadReceipt } from './feeService';
import { getStudentById, setStudentCustomFee } from '../students/studentService';
import StatusBadge from '../../components/shared/StatusBadge';
import { toast } from 'react-hot-toast';
import RecordPaymentModal from './RecordPaymentModal';

const StudentLedgerDrawer = ({ isOpen, studentId, studentName, onClose }) => {
  const [ledger, setLedger] = useState(null);
  const [student, setStudent] = useState(null);
  const [feeMode, setFeeMode] = useState('default'); // 'default' | 'custom'
  const [customFeeAmount, setCustomFeeAmount] = useState('');
  const [customFeeNote, setCustomFeeNote] = useState('');
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
      setFeeMode('default');
      setCustomFeeAmount('');
      setCustomFeeNote('');
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
      
      // Fetch student details
      const studentRes = await getStudentById(studentId);
      if (studentRes.success) {
        const sData = studentRes.data;
        setStudent(sData);
        if (sData.customFee !== null && sData.customFee !== undefined) {
          setFeeMode('custom');
          setCustomFeeAmount(sData.customFee.toString());
          setCustomFeeNote(sData.customFeeNote || '');
        } else {
          setFeeMode('default');
          setCustomFeeAmount('');
          setCustomFeeNote('');
        }
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
    let payload = {};
    if (feeMode === 'default') {
      payload = { customFee: null, customFeeNote: null };
    } else {
      const feeVal = parseFloat(customFeeAmount);
      if (isNaN(feeVal) || feeVal < 0) {
        toast.error('Please enter a valid non-negative custom fee amount');
        return;
      }
      payload = { customFee: feeVal, customFeeNote: customFeeNote ? customFeeNote.trim() : null };
    }

    try {
      setSavingFee(true);
      setSuccessNote('');
      const res = await setStudentCustomFee(studentId, payload);
      if (res.success) {
        toast.success('Fee settings updated successfully');
        setSuccessNote(res.message || "Fee settings updated. This will apply starting next month — the current month's bill has already been set.");
        // Refresh student details
        const studentRes = await getStudentById(studentId);
        if (studentRes.success) {
          const sData = studentRes.data;
          setStudent(sData);
          if (sData.customFee !== null && sData.customFee !== undefined) {
            setFeeMode('custom');
            setCustomFeeAmount(sData.customFee.toString());
            setCustomFeeNote(sData.customFeeNote || '');
          } else {
            setFeeMode('default');
            setCustomFeeAmount('');
            setCustomFeeNote('');
          }
        }
      } else {
        toast.error(res.message || 'Failed to update fee settings');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred while saving fee settings');
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
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-end">
      
      {/* Backdrop click close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Sliding Panel */}
      <div className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col z-10 animate-slideLeft">
        
        {/* Drawer Header */}
        <div className="bg-navy-900 px-6 py-5 text-white flex justify-between items-center shrink-0">
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

              {/* Fee Settings Block */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Monthly Fee Setting
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Class Default: <strong className="text-slate-800 font-bold">Rs. {(student?.classId?.defaultFee || 0).toLocaleString()}</strong>/mo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeMode('default')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-left flex flex-col ${
                      feeMode === 'default'
                        ? 'border-navy-900 bg-navy-50 text-navy-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <span>Use Class Default</span>
                    <span className="text-[10px] font-medium opacity-75">Rs. {(student?.classId?.defaultFee || 0).toLocaleString()}/mo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeMode('custom')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-left flex flex-col ${
                      feeMode === 'custom'
                        ? 'border-navy-900 bg-navy-50 text-navy-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <span>Custom Override</span>
                    <span className="text-[10px] font-medium opacity-75">Scholarship / Waiver</span>
                  </button>
                </div>

                {feeMode === 'custom' && (
                  <div className="space-y-2 pt-1 animate-fadeIn">
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Custom fee amount (Rs.)"
                        value={customFeeAmount}
                        onChange={(e) => setCustomFeeAmount(e.target.value)}
                        className="w-1/2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-900/20"
                      />
                      <input
                        type="text"
                        placeholder="Reason / Note (optional)"
                        value={customFeeNote}
                        onChange={(e) => setCustomFeeNote(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-900/20"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Applies starting next month.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveMonthlyFee}
                    disabled={savingFee || (feeMode === 'custom' && (!customFeeAmount || parseFloat(customFeeAmount) < 0))}
                    className="bg-navy-900 hover:bg-navy-800 text-white font-bold py-1.5 px-4 rounded-xl transition-colors flex items-center space-x-1.5 text-xs shadow-xs disabled:opacity-50"
                  >
                    {savingFee ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save Fee</span>
                  </button>
                </div>

                {successNote && (
                  <p className="text-[10px] text-navy-900 font-semibold bg-navy-50/50 p-2.5 rounded-lg border border-navy-100 leading-normal">
                    {successNote}
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
                      const isExpanded = !!expandedMonths[record._id];
                      const remaining = Math.max(0, record.amountDue - record.amountPaid);
                      const isAdmission = record.type === 'admission';
                      const isOneTime = record.type === 'one_time';
                      
                      let recordTitle = formatMonth(record.month);
                      if (isAdmission) {
                        recordTitle = 'Admission & Books Due';
                      } else if (isOneTime) {
                        recordTitle = record.title || 'One-Time Charge';
                      }

                      return (
                        <div
                          key={record._id}
                          className={`border rounded-xl overflow-hidden shadow-sm ${
                            isAdmission
                              ? 'border-l-4 border-l-blue-500 border-gray-200/80'
                              : isOneTime
                              ? 'border-l-4 border-l-purple-500 border-gray-200/80'
                              : 'border-gray-200/80'
                          }`}
                        >
                          {/* Month Row */}
                          <div
                            onClick={() => handleToggleMonth(record._id)}
                            className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 cursor-pointer select-none transition-colors"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-black text-navy-950 dark:text-slate-100 flex items-center flex-wrap gap-1.5">
                                <span>{recordTitle}</span>
                                {isAdmission && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-sky-950/40 text-blue-700 dark:text-sky-300 border border-blue-100 dark:border-sky-800/40 rounded-md">
                                    Admission
                                  </span>
                                )}
                                {isOneTime && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40 rounded-md">
                                    One-Time Charge
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center space-x-3 text-[10px] text-gray-500 dark:text-slate-400 font-semibold">
                                <span>Due: <strong className="text-navy-950 dark:text-slate-100">Rs. {record.amountDue}</strong></span>
                                <span>Paid: <strong className="text-emerald-600 dark:text-emerald-400">Rs. {record.amountPaid}</strong></span>
                                {remaining > 0 && <span>Left: <strong className="text-rose-600 dark:text-rose-400">Rs. {remaining}</strong></span>}
                                {record.dueDate && (
                                  <span>Due Date: <strong className="text-slate-600 dark:text-slate-300">{formatDate(record.dueDate)}</strong></span>
                                )}
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
                                  className="p-1 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-100 dark:border-emerald-800/40 transition-colors"
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
                                <p className="text-xxs text-gray-400 italic">No payments recorded for this charge.</p>
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs focus:outline-none"
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
