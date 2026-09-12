import React from 'react';
import { Wallet, X } from 'lucide-react';

/**
 * Modal to configure custom monthly fee override or reset to class default for a student.
 */
const SetCustomFeeModal = ({
  isOpen,
  student,
  feeMode,
  setFeeMode,
  customFeeAmount,
  setCustomFeeAmount,
  customFeeNote,
  setCustomFeeNote,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  if (!isOpen || !student) return null;

  const classDefaultFee = student.classId?.defaultFee || 0;
  const className = student.classId?.name || 'Assigned Class';

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-navy-50 dark:bg-sky-950/40 text-navy-900 dark:text-sky-400 rounded-xl">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Set Monthly Fee</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {student.fullName} ({student.registrationNumber})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Reference Info Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Class</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {className}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Class Default Fee</span>
              <span className="font-bold text-navy-900 dark:text-sky-400">
                Rs. {classDefaultFee.toLocaleString()} / month
              </span>
            </div>
          </div>

          {/* Fee Mode Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Fee Billing Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFeeMode('default')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col ${
                  feeMode === 'default'
                    ? 'border-navy-900 bg-navy-50/70 text-navy-900 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-500 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span>Use Class Default</span>
                <span className="text-[10px] font-medium opacity-80 mt-0.5">Rs. {classDefaultFee.toLocaleString()}/mo</span>
              </button>

              <button
                type="button"
                onClick={() => setFeeMode('custom')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col ${
                  feeMode === 'custom'
                    ? 'border-navy-900 bg-navy-50/70 text-navy-900 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-500 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span>Custom Override</span>
                <span className="text-[10px] font-medium opacity-80 mt-0.5">Scholarship / Waiver</span>
              </button>
            </div>
          </div>

          {/* Custom Fee Fields if feeMode === 'custom' */}
          {feeMode === 'custom' && (
            <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl animate-fadeIn">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Custom Monthly Fee (Rs.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 2500"
                  value={customFeeAmount}
                  onChange={(e) => setCustomFeeAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus-ring-navy-900/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Reason / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scholarship, Sibling Discount, Staff Child"
                  value={customFeeNote}
                  onChange={(e) => setCustomFeeNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus-ring-2 focus:ring-navy-900/30"
                />
              </div>
            </div>
          )}

          {/* Helper Notice */}
          <p className="text-[11px] text-slate-400 font-medium">
            Note: Fee updates apply starting next month. Current and past month bills remain unchanged.
          </p>

          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (feeMode === 'custom' && (!customFeeAmount || parseFloat(customFeeAmount) < 0))}
              className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? 'Saving...' : 'Save Fee Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetCustomFeeModal;
