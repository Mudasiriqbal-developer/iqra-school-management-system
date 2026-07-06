import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertTriangle } from 'lucide-react';
import { recordPayment } from './feeService';
import { toast } from 'react-hot-toast';

const RecordPaymentModal = ({ isOpen, onClose, student, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [paidOn, setPaidOn] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [forMonth, setForMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');

  // Reset fields when student changes or modal opens
  useEffect(() => {
    if (student) {
      setAmount('');
      setMethod('cash');
      setPaidOn(new Date().toISOString().split('T')[0]);
      setWarning('');

      // Determine default month name from dueDate or current date
      if (student.feeInfo?.dueDate) {
        const d = new Date(student.feeInfo.dueDate);
        setForMonth(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      } else {
        const d = new Date();
        setForMonth(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      }
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const amountDue = student.feeInfo?.amountDue || 0;
  const amountPaid = student.feeInfo?.amountPaid || 0;
  const remainingBalance = Math.max(0, amountDue - amountPaid);

  const handleAmountChange = (val) => {
    setAmount(val);
    const parsedAmount = parseFloat(val);
    if (!isNaN(parsedAmount) && parsedAmount > remainingBalance) {
      setWarning(`Warning: Amount exceeds the remaining balance of Rs. ${remainingBalance}.`);
    } else {
      setWarning('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setLoading(true);
      const res = await recordPayment(student._id, {
        amount: paymentAmount,
        method,
        paidOn: paidOn ? new Date(paidOn).toISOString() : undefined,
        forMonth: forMonth.trim() || undefined
      });

      if (res.success) {
        const updatedStudent = res.data;
        const newPaid = updatedStudent.feeInfo?.amountPaid || 0;
        const newDue = updatedStudent.feeInfo?.amountDue || 0;
        const newStatus = updatedStudent.feeInfo?.status || 'pending';
        const newRemaining = Math.max(0, newDue - newPaid);

        if (newStatus === 'paid') {
          toast.success(`Payment recorded — status is now Paid!`);
        } else {
          toast.success(`Payment recorded — remaining balance: Rs. ${newRemaining}`);
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="relative bg-navy-primary px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight">Record Fee Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Student Account Summary */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
              <p className="text-xxs font-bold text-gray-400 uppercase tracking-wider">Student Profile</p>
              <p className="text-sm font-bold text-navy-950">{student.fullName}</p>
              <p className="text-xxs text-slate-500 font-medium">Reg No: {student.registrationNumber}</p>
              
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 text-center text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Total Due</span>
                  <span className="font-bold text-navy-950">Rs. {amountDue}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Paid</span>
                  <span className="font-bold text-emerald-600">Rs. {amountPaid}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium font-bold">Remaining</span>
                  <span className="font-bold text-rose-600">Rs. {remainingBalance}</span>
                </div>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Amount (Rs.) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={`e.g. ${remainingBalance}`}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                  required
                />
                {warning && (
                  <div className="flex items-start space-x-1.5 mt-1.5 text-amber-600 text-xxs font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fee for Month *
                </label>
                <input
                  type="text"
                  value={forMonth}
                  onChange={(e) => setForMonth(e.target.value)}
                  placeholder="e.g. June 2026"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Method *
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                  required
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-navy-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center space-x-2"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RecordPaymentModal;
