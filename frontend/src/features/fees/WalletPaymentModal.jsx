import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { recordPayment } from './feeService';
import { toast } from 'react-hot-toast';

const WalletPaymentModal = ({ isOpen, feeRecord, studentName, onSuccess, onClose }) => {
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
        // Look at the returned message or status
        const updatedRecord = res.data;
        if (res.message && res.message.includes('capped')) {
          toast.success(res.message);
        } else if (updatedRecord.status === 'paid') {
          toast.success('Fully paid!');
        } else {
          toast.success(`Payment recorded — Rs. ${finalAmount} paid`);
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-150 overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="relative bg-navy-primary px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-white animate-pulse" />
            <div>
              <h2 className="text-md font-bold tracking-tight">{studentName}</h2>
              <p className="text-xxs text-slate-200 font-bold uppercase tracking-wider mt-0.5">{month} Fee Payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Outstanding Balance Banner */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remaining Balance</span>
              <p className="text-2xl font-black text-rose-600 mt-0.5">Rs. {remainingBalance.toLocaleString()}</p>
            </div>
            <div className="text-right text-xs text-gray-500 font-semibold space-y-1">
              <div>Total Bill: <span className="text-navy-950 font-bold">Rs. {amountDue.toLocaleString()}</span></div>
              <div>Paid So Far: <span className="text-emerald-600 font-bold">Rs. {amountPaid.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Payment Option Cards */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Select Payment Amount</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Pay in Full */}
              <button
                type="button"
                onClick={() => setSelectedOption('full')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 ${
                  selectedOption === 'full'
                    ? 'border-navy-primary bg-navy-50/40 ring-2 ring-navy-primary/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-xs font-bold text-navy-950">Pay in Full</span>
                <span className="text-sm font-black text-navy-primary mt-2">Rs. {remainingBalance.toLocaleString()}</span>
              </button>

              {/* Pay Half */}
              <button
                type="button"
                onClick={() => setSelectedOption('half')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 ${
                  selectedOption === 'half'
                    ? 'border-navy-primary bg-navy-50/40 ring-2 ring-navy-primary/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-navy-950">Pay Half</span>
                  <p className="text-[9px] text-gray-400 font-semibold mt-0.5">(50% of original bill)</p>
                </div>
                <span className="text-sm font-black text-navy-primary mt-2">Rs. {halfAmount.toLocaleString()}</span>
              </button>

              {/* Custom */}
              <button
                type="button"
                onClick={() => setSelectedOption('custom')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 ${
                  selectedOption === 'custom'
                    ? 'border-navy-primary bg-navy-50/40 ring-2 ring-navy-primary/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-xs font-bold text-navy-950">Custom Amount</span>
                <span className="text-xs text-slate-500 font-bold mt-2">Enter manually</span>
              </button>

            </div>
          </div>

          {/* Conditional Custom Amount Input */}
          {selectedOption === 'custom' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Amount (Rs.)</label>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="Enter exact amount to pay"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                required
              />
              {parseFloat(customAmount) > remainingBalance && (
                <div className="flex items-center space-x-1.5 text-amber-600 text-xxs font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Amount exceeds remaining balance. It will be capped at Rs. {remainingBalance}.</span>
                </div>
              )}
            </div>
          )}

          {/* Method Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary font-semibold"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-navy-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center space-x-2 disabled:opacity-40 disabled:hover:opacity-40"
              disabled={isConfirmDisabled}
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default WalletPaymentModal;
