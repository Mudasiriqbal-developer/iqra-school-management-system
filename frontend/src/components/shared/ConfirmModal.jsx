import React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  onConfirm,
  onCancel,
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 overflow-hidden transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-xl border ${iconColor} shrink-0`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-navy-950 mb-1 leading-snug">
              {title}
            </h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 active:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 text-white rounded-xl text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmBtnColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
