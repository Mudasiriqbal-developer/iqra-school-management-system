import React from 'react';

const StatCard = ({ icon: Icon, label, value, trend, trendColor, onClick }) => {
  // Determine trend color styling classes
  let badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
  if (trendColor === 'danger') {
    badgeClass = 'text-rose-700 bg-rose-50 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
  } else if (trendColor === 'pending') {
    badgeClass = 'text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
  } else if (trendColor === 'info') {
    badgeClass = 'text-sky-700 bg-sky-50 border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/40';
  }

  // Dynamic font sizing to prevent long strings from breaking layout
  const getValueFontSize = (val) => {
    if (typeof val !== 'string' && typeof val !== 'number') return 'text-2xl sm:text-3xl';
    const str = String(val);
    if (str.length > 22) return 'text-sm sm:text-base font-bold';
    if (str.length > 14) return 'text-lg sm:text-xl font-bold';
    return 'text-2xl sm:text-3xl font-bold';
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between transition-all duration-200 min-h-[155px] group ${
        onClick 
          ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600' 
          : ''
      }`}
    >
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          {/* Icon container */}
          <div className="p-2.5 bg-navy-50/80 dark:bg-sky-950/40 text-navy-950 dark:text-sky-400 border border-navy-100/60 dark:border-sky-900/40 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
            {Icon && <Icon className="h-5 w-5" />}
          </div>
        </div>

        <div className="mt-4">
          <span className={`${getValueFontSize(value)} text-slate-900 dark:text-slate-50 tracking-tight block leading-tight break-words`} title={typeof value === 'string' ? value : undefined}>
            {value}
          </span>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5 block">
            {label}
          </div>
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass} w-full text-center truncate`} title={trend}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
