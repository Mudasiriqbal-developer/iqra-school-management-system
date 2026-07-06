import React from 'react';
import { X, Calendar, DollarSign, Wallet } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';

const FeeHistoryDrawer = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null;

  const amountPaid = student.feeInfo?.amountPaid || 0;
  const amountDue = student.feeInfo?.amountDue || 0;
  const progressPercent = amountDue > 0 ? Math.min(100, Math.round((amountPaid / amountDue) * 100)) : 0;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Map fee status to StatusBadge type
  const getFeeBadgeProps = (feeStatus) => {
    switch (feeStatus) {
      case 'paid':
        return { status: 'active', label: 'Paid' };
      case 'pending':
        return { status: 'pending', label: 'Pending' };
      case 'overdue':
        return { status: 'danger', label: 'Overdue' };
      default:
        return { status: 'default', label: feeStatus || 'Unpaid' };
    }
  };

  const feeStatusProps = getFeeBadgeProps(student.feeInfo?.status);

  // Sort payment history by newest first
  const paymentHistory = [...(student.feeInfo?.history || [])].sort(
    (a, b) => new Date(b.paidOn) - new Date(a.paidOn)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 my-8">
        
        {/* Header */}
        <div className="relative bg-navy-primary px-6 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Payment History</h2>
            <p className="text-xs text-slate-200 mt-0.5">{student.fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Progress Info */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Status:</span>
              <StatusBadge status={feeStatusProps.status} label={feeStatusProps.label} />
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Paid: Rs. {amountPaid}</span>
                <span>Due: Rs. {amountDue}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-navy-primary h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-right text-xs text-slate-400 font-medium">
                {progressPercent}% Collected
              </p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* History List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center">
              <Wallet className="h-4 w-4 mr-1.5 text-navy-primary" />
              Transactions
            </h3>

            {paymentHistory.length > 0 ? (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {paymentHistory.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Rs. {item.amount} {item.forMonth && <span className="text-xs font-bold text-slate-500">({item.forMonth})</span>}
                        </p>
                        <p className="text-xxs text-gray-400 font-medium capitalize">
                          Via {item.method?.replace('_', ' ') || 'Cash'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-medium flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {formatDate(item.paidOn)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 italic">No payments recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-navy-primary hover:opacity-90 text-white rounded-xl text-sm font-bold transition-opacity focus:outline-none"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default FeeHistoryDrawer;
