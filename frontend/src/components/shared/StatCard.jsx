import React from 'react';

const StatCard = ({ icon: Icon, label, value, trend, trendColor }) => {
  // Determine trend color styling classes
  let badgeClass = 'text-green-600 bg-green-50 border-green-100';
  if (trendColor === 'danger') {
    badgeClass = 'text-red-600 bg-red-50 border-red-100';
  } else if (trendColor === 'pending') {
    badgeClass = 'text-amber-600 bg-amber-50 border-amber-100';
  } else if (trendColor === 'info') {
    badgeClass = 'text-blue-600 bg-blue-50 border-blue-100';
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-start">
        {/* Icon in soft colored circle/square */}
        <div className="p-3 bg-navy-50 rounded-xl text-navy-900 border border-navy-100/50">
          {Icon && <Icon className="h-6 w-6" />}
        </div>
        
        {/* Optional Trend Badge */}
        {trend && (
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
            {trend}
          </span>
        )}
      </div>

      <div className="mt-4">
        <span className="text-3xl font-extrabold text-navy-950 tracking-tight block">
          {value}
        </span>
        <span className="text-sm font-medium text-gray-500 mt-1 block">
          {label}
        </span>
      </div>
    </div>
  );
};

export default StatCard;
