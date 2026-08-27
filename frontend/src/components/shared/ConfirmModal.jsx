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
    danger: 'text-red-600 bg-red-50 border-red-100',
    warning: 'text-amber-600 bg-amber-50 border-amber-100',
    info: 'text-blue-600 bg-blue-50 border-blue-100',
  }[type];

  const confirmBtnColor = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  }[type];

  const IconComponent = {
    danger: Trash2,
    warning: AlertTriangle,
    info: Info,
  }[type];

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 p-6 overflow-hidden transform animate-modal-zoom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3.5 rounded-2xl border ${iconColor} shrink-0 shadow-xs`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-navy-950 dark:text-slate-50 mb-1 leading-snug">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-300 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700/80">
          <button
            onClick={onCancel || onClose}
            className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmBtnColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
