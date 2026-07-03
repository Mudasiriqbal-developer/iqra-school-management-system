import React from 'react';

const StatusBadge = ({ status = 'active', label }) => {
  let badgeStyle = '';

  switch (status) {
    case 'active':
      badgeStyle = 'bg-green-50 text-green-700 border-green-200';
      break;
    case 'pending':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'danger':
      badgeStyle = 'bg-red-50 text-red-700 border-red-200';
      break;
    case 'info':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    default:
      badgeStyle = 'bg-gray-50 text-gray-600 border-gray-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} select-none`}>
      {label}
    </span>
  );
};

export default StatusBadge;
