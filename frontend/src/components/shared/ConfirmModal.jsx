import React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  onConfirm,
  onCancel,
  onClose,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
}) => {
  if (!isOpen) return null;

  const iconColor = {
    danger: 'text-rose-600 bg-rose-50 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40',
    warning: 'text-amber-600 bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
    info: 'text-sky-600 bg-sky-50 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/40',
  }[type];

  const confirmBtnColor = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-navy-900 hover:bg-navy-800 text-white',
  }[type];

  const IconComponent = {
    danger: Trash2,
    warning: AlertTriangle,
    info: Info,
  }[type];

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-6 overflow-hidden transform animate-modal-zoom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-xl border ${iconColor} shrink-0`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/80">
          <button
            onClick={onCancel || onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors focus:outline-none ${confirmBtnColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
