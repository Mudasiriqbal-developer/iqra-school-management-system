import React from 'react';

const StatusBadge = ({ status = 'active', label }) => {
  let badgeStyle = '';
  let dotStyle = '';

  switch (status) {
    case 'active':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40';
      dotStyle = 'bg-emerald-500';
      break;
    case 'pending':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40';
      dotStyle = 'bg-amber-500';
      break;
    case 'danger':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40';
      dotStyle = 'bg-rose-500';
      break;
    case 'info':
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/40';
      dotStyle = 'bg-sky-500';
      break;
    default:
      badgeStyle = 'bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      dotStyle = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle} select-none shadow-2xs`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`}></span>
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
