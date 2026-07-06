import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#00153D] text-white text-xs px-3 py-2 rounded-lg shadow-md border border-[#00215E]/30">
        <p className="font-semibold">{`${data.month} ${data.year}: ${payload[0].value}%`}</p>
      </div>
    );
  }
  return null;
};

const AttendanceTrendChart = ({ data = [] }) => {
  const hasNoData = !data || data.length === 0 || data.every(item => Number(item.averageAttendancePercentage) === 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#00153D]">Monthly Attendance Trends</h2>
        <p className="text-xs text-gray-400 mt-0.5">Performance metrics over the last 6 months</p>
      </div>

      {hasNoData ? (
        <div className="h-[300px] flex items-center justify-center border border-dashed border-gray-200/80 rounded-xl bg-gray-50/50">
          <span className="text-sm font-medium text-gray-400 text-center px-4">
            No attendance data yet — trends will appear as attendance is recorded
          </span>
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                dx={-5}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F3F4F6' }} />
              <Line
                type="monotone"
                dataKey="averageAttendancePercentage"
                stroke="#00215E"
                strokeWidth={3}
                dot={{ r: 4, stroke: '#00215E', strokeWidth: 2, fill: '#FFF' }}
                activeDot={{ r: 6, stroke: '#00215E', strokeWidth: 2, fill: '#FFF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AttendanceTrendChart;
