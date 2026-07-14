import React, { useState, useEffect } from 'react';
import { X, Calendar, RefreshCw, AlertCircle, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentAttendanceSummary } from './adminAttendanceService';

const StudentAttendanceHistoryModal = ({ isOpen, onClose, student }) => {
  // Default range: last 30 days
  const getPastDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const getTodayStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(() => getPastDateStr(30));
  const [endDate, setEndDate] = useState(() => getTodayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  // Fetch summary when student or date range changes
  useEffect(() => {
    if (!isOpen || !student) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getStudentAttendanceSummary(student._id, startDate, endDate);
        if (res.success) {
          setSummary(res.data);
        } else {
          throw new Error(res.message || 'Failed to retrieve attendance history.');
        }
      } catch (err) {
        console.error('Error fetching student summary:', err);
        setError(err.message || 'Failed to load attendance summary.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [student, startDate, endDate, isOpen]);

  if (!isOpen || !student) return null;

  // Circle SVG math
  const attendancePercentage = summary?.attendancePercentage ?? 0;
  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (attendancePercentage / 100) * circumference;

  // Handler for range changes to prevent start date being after end date
  const handleStartDateChange = (e) => {
    const val = e.target.value;
    if (endDate && val > endDate) {
      toast.error('Start date cannot be after end date');
      return;
    }
    setStartDate(val);
  };

  const handleEndDateChange = (e) => {
    const val = e.target.value;
    if (startDate && val < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    setEndDate(val);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 my-8">
        
        {/* Modal Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">{student.fullName}</h2>
              <p className="text-xs text-slate-300 font-semibold tracking-wide mt-0.5">
                Reg No: {student.registrationNumber || 'N/A'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Date Picker Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate || getTodayStr()}
                onChange={handleStartDateChange}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-700/50 focus:border-navy-700 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={getTodayStr()}
                onChange={handleEndDateChange}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-700/50 focus:border-navy-700 shadow-sm"
              />
            </div>
          </div>

          {/* Body Loading/Error States */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="animate-spin h-8 w-8 text-navy-900" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Loading history data...
              </span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-3 text-red-800 text-sm">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : summary && summary.totalDays === 0 ? (
            <div className="py-12 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
              <Calendar className="mx-auto h-10 w-10 text-gray-300" />
              <p className="text-sm font-semibold text-navy-950 mt-3">No records found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                No attendance records exist for this student within the selected date range.
              </p>
            </div>
          ) : summary ? (
            <div className="space-y-6 flex flex-col items-center">
              {/* Circular Progress Bar */}
              <div className="relative flex items-center justify-center w-36 h-36">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Outer circle track */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="text-gray-100"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="text-navy-900 transition-all duration-500 ease-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-navy-950 tracking-tight">
                    {attendancePercentage}%
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                    Attendance
                  </span>
                </div>
              </div>

              {/* Attendance Counts summary */}
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500">
                  Based on <span className="font-extrabold text-navy-950">{summary.totalDays}</span> days of record
                </p>
              </div>

              {/* Status breakdown grid */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {/* Present */}
                <div className="bg-green-50/50 border border-green-100/60 rounded-xl p-2.5 text-center">
                  <span className="block text-lg font-black text-green-700">{summary.presentCount}</span>
                  <span className="block text-[9px] font-bold text-green-600 uppercase tracking-wide">Present</span>
                </div>
                {/* Absent */}
                <div className="bg-red-50/50 border border-red-100/60 rounded-xl p-2.5 text-center">
                  <span className="block text-lg font-black text-red-700">{summary.absentCount}</span>
                  <span className="block text-[9px] font-bold text-red-600 uppercase tracking-wide">Absent</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceHistoryModal;
