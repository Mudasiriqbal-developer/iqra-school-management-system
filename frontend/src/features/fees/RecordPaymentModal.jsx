import React, { useState, useEffect } from 'react';
import { X, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { recordPayment } from './feeService';
import { toast } from 'react-hot-toast';

const RecordPaymentModal = ({ isOpen, feeRecord, studentName, onSuccess, onClose }) => {
  const [selectedOption, setSelectedOption] = useState(''); // 'full', 'half', 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  // Reset fields when record changes
  useEffect(() => {
    setSelectedOption('');
    setCustomAmount('');
    setMethod('cash');
  }, [feeRecord]);

  if (!isOpen || !feeRecord) return null;

  const { amountDue, amountPaid, status, month } = feeRecord;
  const remainingBalance = Math.max(0, amountDue - amountPaid);
  const halfAmount = amountDue * 0.5;

  // Don't show if remaining balance is 0 or status is already paid
  if (remainingBalance <= 0 || status === 'paid') {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      toast.error('Please select a payment option');
      return;
    }

    let finalAmount = 0;
    if (selectedOption === 'full') {
      finalAmount = remainingBalance;
    } else if (selectedOption === 'half') {
      finalAmount = halfAmount;
    } else if (selectedOption === 'custom') {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('Please enter a valid custom amount greater than 0');
        return;
      }
      finalAmount = parsed;
    }

    try {
      setLoading(true);
      const res = await recordPayment(feeRecord._id, {
        type: selectedOption,
        amount: selectedOption === 'custom' ? finalAmount : undefined,
        method
      });

      if (res.success) {
        const updatedRecord = res.data;
        if (res.message && res.message.includes('capped')) {
          toast.success(res.message);
        } else if (updatedRecord.status === 'paid') {
          toast.success('Payment recorded - Fully paid!');
        } else {
          toast.success(`Payment recorded — Rs. ${finalAmount} collected`);
        }
        onSuccess();
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

  const isConfirmDisabled = 
    loading ||
    !selectedOption ||
    (selectedOption === 'custom' && (!customAmount || parseFloat(customAmount) <= 0));

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="relative bg-navy-900 dark:bg-slate-950 px-6 py-5 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold tracking-tight">{studentName}</h2>
              <p className="text-[11px] text-slate-200 font-semibold uppercase tracking-wider mt-0.5">
                {feeRecord.type === 'admission' 
                  ? 'Record Admission Fee & Books Payment' 
                  : feeRecord.type === 'one_time' 
                    ? `Record ${feeRecord.title || 'One-Time Charge'} Payment` 
                    : `Record ${month} Fee Collection`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Outstanding Balance Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Remaining Balance</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">Rs. {remainingBalance.toLocaleString()}</p>
            </div>
            <div className="text-right text-xs text-gray-500 dark:text-slate-400 font-semibold space-y-1">
              <div>Total Bill: <span className="text-navy-950 dark:text-white font-bold">Rs. {amountDue.toLocaleString()}</span></div>
              <div>Collected So Far: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Rs. {amountPaid.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Payment Option Cards */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Select Collected Amount</label>
            <div className={`grid grid-cols-1 ${feeRecord.type === 'admission' || feeRecord.type === 'one_time' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
              
              {/* Full Payment */}
              <button
                type="button"
                onClick={() => setSelectedOption('full')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  selectedOption === 'full'
                    ? 'border-navy-primary dark:border-sky-500 bg-navy-50/40 dark:bg-sky-950/40 ring-2 ring-navy-primary/20 dark:ring-sky-500/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/70'
                }`}
              >
                <span className="text-xs font-bold text-navy-950 dark:text-white">Full Payment</span>
                <span className="text-sm font-black text-navy-primary dark:text-sky-400 mt-2">Rs. {remainingBalance.toLocaleString()}</span>
              </button>

              {/* Half Payment */}
              {feeRecord.type !== 'admission' && feeRecord.type !== 'one_time' && (
                <button
                  type="button"
                  onClick={() => setSelectedOption('half')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    selectedOption === 'half'
                      ? 'border-navy-primary dark:border-sky-500 bg-navy-50/40 dark:bg-sky-950/40 ring-2 ring-navy-primary/20 dark:ring-sky-500/20'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/70'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-navy-950 dark:text-white">Half Payment</span>
                    <p className="text-[9px] text-gray-400 dark:text-slate-400 font-semibold mt-0.5">(50% of original bill)</p>
                  </div>
                  <span className="text-sm font-black text-navy-primary dark:text-sky-400 mt-2">Rs. {halfAmount.toLocaleString()}</span>
                </button>
              )}

              {/* Custom */}
              <button
                type="button"
                onClick={() => setSelectedOption('custom')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  selectedOption === 'custom'
                    ? 'border-navy-primary dark:border-sky-500 bg-navy-50/40 dark:bg-sky-950/40 ring-2 ring-navy-primary/20 dark:ring-sky-500/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/70'
                }`}
              >
                <span className="text-xs font-bold text-navy-950 dark:text-white">Custom Amount</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">Enter manually</span>
              </button>

            </div>
          </div>

          {/* Conditional Custom Amount Input */}
          {selectedOption === 'custom' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Custom Amount Collected (Rs.)</label>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="Enter exact amount collected"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                required
              />
              {parseFloat(customAmount) > remainingBalance && (
                <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 text-xxs font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-100 dark:border-amber-900/50">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Amount exceeds remaining balance. Capped at Rs. {remainingBalance}.</span>
                </div>
              )}
            </div>
          )}

          {/* Method Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary font-semibold"
              required
            >
              <option value="cash" className="dark:bg-slate-800">Cash</option>
              <option value="bank_transfer" className="dark:bg-slate-800">Bank Transfer</option>
              <option value="card" className="dark:bg-slate-800">Card (Manual Swipe)</option>
              <option value="other" className="dark:bg-slate-800">Other</option>
            </select>
          </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 dark:bg-navy-700 dark:hover:bg-navy-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center space-x-2 disabled:opacity-40 disabled:hover:opacity-40 cursor-pointer"
              disabled={isConfirmDisabled}
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default RecordPaymentModal;
