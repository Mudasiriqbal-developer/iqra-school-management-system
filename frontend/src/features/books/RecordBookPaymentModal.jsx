import React, { useState, useEffect } from 'react';
import { X, BookOpen, CheckCircle2, Loader2, DollarSign, CreditCard } from 'lucide-react';
import { recordBookPayment } from './bookService';
import { toast } from 'react-hot-toast';

const RecordBookPaymentModal = ({ isOpen, record, onSuccess, onClose }) => {
  const [paymentType, setPaymentType] = useState('full'); // 'full' | 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && record) {
      setPaymentType('full');
      setCustomAmount('');
      setMethod('cash');
      setNote('');

      // Generate UUID client-side for double-submit / network retry safety
      const key = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setIdempotencyKey(key);
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const totalAmount = record.amount || 0;
  const amountPaid = record.amountPaid || 0;
  const remainingBalance = Math.max(0, totalAmount - amountPaid);
  const student = record.student;

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalAmount = remainingBalance;
    if (paymentType === 'custom') {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('Please enter a valid payment amount greater than 0');
        return;
      }
      if (parsed > remainingBalance) {
        toast.error(`Amount cannot exceed remaining balance (Rs. ${remainingBalance.toLocaleString()})`);
        return;
      }
      finalAmount = parsed;
    }

    try {
      setLoading(true);
      const res = await recordBookPayment(record._id, {
        type: paymentType,
        amount: finalAmount,
        method,
        note: note.trim() || undefined,
        idempotencyKey
      });

      if (res.success) {
        toast.success(res.message || 'Book fee payment recorded successfully!');
        if (onSuccess) {
          onSuccess(res.data, res.receiptNumber);
        }
        onClose();
      } else {
        toast.error(res.message || 'Failed to record payment');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred while recording payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-6 py-4 flex items-center justify-between text-white border-b border-navy-700">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400 border border-sky-400/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Record Book Fee Payment</h3>
              <p className="text-xs text-slate-300">Issue official receipt & update ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
          {/* Student Info Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-navy-900 dark:text-sky-400 block">
                  {student?.fullName || 'Student'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reg No: <span className="font-semibold text-slate-700 dark:text-slate-200">{student?.registrationNumber || 'N/A'}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Class / Sec</span>
                <span className="text-xs font-bold text-navy-800 dark:text-sky-300">
                  {student?.classId?.name || record?.classId?.name || 'Class'} {student?.sectionId?.name ? `(${student.sectionId.name})` : ''}
                </span>
              </div>
            </div>

            {/* Financial Status Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
              <div className="bg-white dark:bg-slate-850 rounded-lg p-2 border border-slate-150 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold block">Total Billed</span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-100">Rs. {totalAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white dark:bg-slate-850 rounded-lg p-2 border border-slate-150 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold block">Already Paid</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Rs. {amountPaid.toLocaleString()}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 border border-amber-200/70 dark:border-amber-900/40">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-black block">Balance Due</span>
                <span className="text-xs font-black text-amber-900 dark:text-amber-300">Rs. {remainingBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
              Payment Amount
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('full')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  paymentType === 'full'
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-xs font-bold">Full Balance</span>
                <span className="text-sm font-black text-sky-700 dark:text-sky-400 mt-0.5">Rs. {remainingBalance.toLocaleString()}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('custom')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  paymentType === 'custom'
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-xs font-bold">Custom Partial</span>
                <span className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Enter amount below</span>
              </button>
            </div>
          </div>

          {/* Custom Amount Input */}
          {paymentType === 'custom' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Enter Custom Amount (Rs.) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 font-bold text-sm">Rs.</span>
                <input
                  type="number"
                  min="1"
                  max={remainingBalance}
                  step="any"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`Max: ${remainingBalance}`}
                  required
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
            >
              <option value="cash">Cash In Hand</option>
              <option value="bank_transfer">Bank Transfer / Online</option>
              <option value="online">EasyPaisa / JazzCash</option>
              <option value="card">Debit / Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Remarks / Transaction Reference <span className="text-slate-400 dark:text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid by uncle, slip #1249"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
            />
          </div>

          {/* Idempotency Footer Info */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400 font-mono pt-1">
            <span>Idempotency Protected:</span>
            <span className="truncate max-w-[200px]" title={idempotencyKey}>{idempotencyKey}</span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm shadow-navy-950/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Confirm & Record Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordBookPaymentModal;
