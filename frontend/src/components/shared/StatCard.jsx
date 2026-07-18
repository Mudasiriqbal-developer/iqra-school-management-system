import React from 'react';

const StatCard = ({ icon: Icon, label, value, trend, trendColor }) => {
  // Determine trend color styling classes
  let badgeClass = 'text-green-600 bg-green-50 border-green-150 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30';
  if (trendColor === 'danger') {
    badgeClass = 'text-red-600 bg-red-50 border-red-150 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30';
  } else if (trendColor === 'pending') {
    badgeClass = 'text-amber-600 bg-amber-50 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
  } else if (trendColor === 'info') {
    badgeClass = 'text-blue-600 bg-blue-50 border-blue-150 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
  }

  // Dynamic font sizing to prevent long strings from breaking layout
  const getValueFontSize = (val) => {
    if (typeof val !== 'string' && typeof val !== 'number') return 'text-2xl sm:text-3xl';
    const str = String(val);
    if (str.length > 22) return 'text-sm sm:text-base font-bold';
    if (str.length > 14) return 'text-lg sm:text-xl';
    return 'text-2xl sm:text-3xl';
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 min-h-[160px]">
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          {/* Icon in soft colored circle/square */}
          <div className="p-2.5 bg-navy-50 rounded-xl text-navy-950 border border-navy-100/50 flex-shrink-0">
            {Icon && <Icon className="h-5 w-5" />}
          </div>
        </div>

        <div className="mt-4">
          <span className={`${getValueFontSize(value)} font-extrabold text-navy-950 tracking-tight block leading-tight break-words`} title={typeof value === 'string' ? value : undefined}>
            {value}
          </span>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1.5 block">
            {label}
          </div>
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/80 flex items-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badgeClass} w-full text-center truncate`} title={trend}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
