import React, { useState, useEffect } from 'react';
import {
  BarChart3, FileSpreadsheet, FileText, Copy, Check, Users, Calendar, CalendarCheck,
  AlertTriangle, Download, Loader2, ArrowRight, LayoutDashboard, Wallet,
  BookOpen, Award, Filter, TrendingUp, DollarSign, CalendarClock
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import {
  getFeeDefaulters,
  getAttendanceSummary,
  downloadCollectionsCSV,
  downloadCollectionsPDF
} from '../features/reports/reportService';
import { getClasses, getSectionsByClass } from '../features/students/studentService';

const getFirstDayOfCurrentMonth = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getTodayDateStr = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AdminReports = () => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Expense Tracker', icon: TrendingUp, path: '/admin/expenses' },
    { label: 'Salary Payroll', icon: DollarSign, path: '/admin/payroll' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  // Active Tab: 'defaulters' or 'attendance'
  const [activeTab, setActiveTab] = useState('defaulters');

  // Loading and dropdown filter states
  const [loading, setLoading] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  // Tab 1: Defaulters States
  const [defaultersClassId, setDefaultersClassId] = useState('');
  const [defaultersSectionId, setDefaultersSectionId] = useState('');
  const [defaultersData, setDefaultersData] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [copiedRowId, setCopiedRowId] = useState(null);

  // Tab 2: Attendance States
  const [startDate, setStartDate] = useState(getFirstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState(getTodayDateStr());
  const [attendanceData, setAttendanceData] = useState([]);

  // Export Section States
  const defaultDate = new Date();
  const [exportMonth, setExportMonth] = useState(defaultDate.getMonth() + 1);
  const [exportYear, setExportYear] = useState(defaultDate.getFullYear());
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Load Classes list on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await getClasses();
        if (res.success) {
          setClassesList(res.data);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch sections cascading when class ID changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!defaultersClassId) {
        setSectionsList([]);
        setDefaultersSectionId('');
        return;
      }
      try {
        const res = await getSectionsByClass(defaultersClassId);
        if (res.success) {
          setSectionsList(res.data);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
      }
    };
    fetchSections();
  }, [defaultersClassId]);

  // Load Defaulters Data
  const fetchDefaulters = async () => {
    try {
      setLoading(true);
      const res = await getFeeDefaulters(defaultersClassId, defaultersSectionId);
      if (res.success) {
        setDefaultersData(res.data.defaulters || []);
        setTotalOutstanding(res.data.totalOutstanding || 0);
      }
    } catch (err) {
      console.error('Error fetching defaulters:', err);
      toast.error('Failed to load fee defaulters');
    } finally {
      setLoading(false);
    }
  };

  // Load Attendance Summary Data
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await getAttendanceSummary(startDate, endDate);
      if (res.success) {
        setAttendanceData(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching attendance summary:', err);
      toast.error('Failed to load attendance summary');
    } finally {
      setLoading(false);
    }
  };

  // Trigger queries based on active tab and parameters
  useEffect(() => {
    if (activeTab === 'defaulters') {
      fetchDefaulters();
    }
  }, [activeTab, defaultersClassId, defaultersSectionId]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab, startDate, endDate]);

  // Copy Contact Handler
  const handleCopyContact = (studentId, contact, name) => {
    if (!contact) {
      toast.error('No contact number available');
      return;
    }
    navigator.clipboard.writeText(contact);
    setCopiedRowId(studentId);
    toast.success(`Contact copied for ${name}`);
    setTimeout(() => {
      setCopiedRowId(null);
    }, 1500);
  };

  // Export CSV Handler
  const handleExportCSV = async () => {
    try {
      setDownloadingCSV(true);
      await downloadCollectionsCSV(exportMonth, exportYear);
      toast.success('CSV report downloaded successfully');
    } catch (err) {
      console.error('CSV Export Error:', err);
      toast.error(err.response?.data?.message || 'Failed to download CSV report');
    } finally {
      setDownloadingCSV(false);
    }
  };

  // Export PDF Handler
  const handleExportPDF = async () => {
    try {
      setDownloadingPDF(true);
      await downloadCollectionsPDF(exportMonth, exportYear);
      toast.success('PDF report downloaded successfully');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error(err.response?.data?.message || 'Failed to download PDF report');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const getStatusBadgeProps = (feeStatus) => {
    switch (feeStatus) {
      case 'paid':
        return { status: 'active', label: 'Paid' };
      case 'pending':
        return { status: 'pending', label: 'Pending' };
      case 'overdue':
        return { status: 'danger', label: 'Overdue' };
      default:
        return { status: 'default', label: feeStatus || 'N/A' };
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Mudasir Iqbal"
      userRole="Administrator"
      subtitle="Administrative Suite"
    >
      <div className="space-y-8">
        {/* Header and Export Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-navy-900" />
              Reports & Audits
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Monitor student financial statuses, trace collections history, and evaluate attendance trends across all grades.
            </p>
          </div>

          {/* Export Panel Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
            <h3 className="text-sm font-bold text-navy-950 mb-3 flex items-center gap-1.5">
              <Download className="h-4 w-4 text-navy-900" />
              Export Monthly Collections
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Month</label>
                <select
                  value={exportMonth}
                  onChange={(e) => setExportMonth(parseInt(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-navy-900"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Year</label>
                <input
                  type="number"
                  value={exportYear}
                  onChange={(e) => setExportYear(parseInt(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-navy-900"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                disabled={downloadingCSV}
                className="flex-1 bg-navy-900 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 hover:bg-navy-800 transition-colors shadow-sm text-xs disabled:opacity-50"
              >
                {downloadingCSV ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={downloadingPDF}
                className="flex-1 bg-[#00215E] text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 hover:bg-navy-900 transition-colors shadow-sm text-xs disabled:opacity-50"
              >
                {downloadingPDF ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Buttons & Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 ${
              activeTab === 'defaulters'
                ? 'border-navy-900 text-navy-900 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Fee Defaulters
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 ${
              activeTab === 'attendance'
                ? 'border-navy-900 text-navy-900 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Attendance Summary
          </button>
        </div>

        {/* --- TAB 1 CONTENT: FEE DEFAULTERS --- */}
        {activeTab === 'defaulters' && (
          <div className="space-y-6">
            {/* Filter Bar and Stat Card Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Filter inputs */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 flex flex-col justify-center">
                <div className="flex items-center space-x-2 text-gray-400 mb-3.5">
                  <Filter className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Filter Defaulters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Class</label>
                    <select
                      value={defaultersClassId}
                      onChange={(e) => {
                        setDefaultersClassId(e.target.value);
                        setDefaultersSectionId('');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-navy-900"
                    >
                      <option value="">All Classes</option>
                      {classesList.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {/^\d+$/.test(cls.name) ? 'Class ' : ''}{cls.name} — {cls.gender ? cls.gender.charAt(0).toUpperCase() + cls.gender.slice(1) : 'Mixed'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Section</label>
                    <select
                      value={defaultersSectionId}
                      onChange={(e) => setDefaultersSectionId(e.target.value)}
                      disabled={!defaultersClassId}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-navy-900 disabled:opacity-50"
                    >
                      <option value="">All Sections</option>
                      {sectionsList.map((sec) => (
                        <option key={sec._id} value={sec._id}>{sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Outstanding Stat Card */}
              <StatCard
                icon={Wallet}
                label="Total Outstanding Balances"
                value={formatCurrency(totalOutstanding)}
                trend="Dues Pending"
                trendColor="danger"
              />
            </div>

            {/* Defaulters Table */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-8 w-8 text-navy-900 animate-spin" />
                  <span className="text-sm font-semibold text-gray-500">Loading defaulters list...</span>
                </div>
              ) : defaultersData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12">
                  <div className="h-16 w-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 border border-green-100">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-950">No Defaulters</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">No outstanding fees — all students are paid up!</p>
                </div>
              ) : (
                <div>
                  {/* Stacked Cards for Mobile */}
                  <div className="block sm:hidden divide-y divide-border">
                    {defaultersData.map((row) => {
                      const badgeProps = getStatusBadgeProps(row.status);
                      return (
                        <div key={row.studentId} className="p-4 space-y-3 bg-surface hover:bg-background/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-text-primary text-sm">{row.fullName}</div>
                              <div className="text-xs text-text-secondary font-semibold mt-0.5">Reg: {row.registrationNumber}</div>
                            </div>
                            <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-secondary block">Class/Section</span>
                              <span className="font-semibold text-text-primary">{row.classId?.name || 'N/A'} - {row.sectionId?.name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-secondary block">Outstanding</span>
                              <span className="font-bold text-danger">{formatCurrency(row.outstandingAmount)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-secondary block">Amount Due</span>
                              <span className="font-semibold text-text-primary">{formatCurrency(row.amountDue)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-secondary block">Amount Paid</span>
                              <span className="font-semibold text-success">{formatCurrency(row.amountPaid)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-secondary block">Due Date</span>
                              <span className="font-semibold text-text-primary">{formatDate(row.dueDate)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-secondary block">Father's Contact</span>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className="font-semibold text-text-primary">{row.fatherContact}</span>
                                <button
                                  onClick={() => handleCopyContact(row.studentId, row.fatherContact, row.fullName)}
                                  title="Copy Contact"
                                  className="p-1 hover:bg-background rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                                >
                                  {copiedRowId === row.studentId ? (
                                    <Check className="h-3 w-3 text-success" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Table for Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-background border-b border-border">
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Student</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Class/Section</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Father's Contact</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Amount Due</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Amount Paid</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Outstanding</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Due Date</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {defaultersData.map((row) => {
                          const badgeProps = getStatusBadgeProps(row.status);
                          return (
                            <tr key={row.studentId} className="hover:bg-background/40 transition-colors">
                              <td className="py-4 px-6 text-sm">
                                <div className="font-bold text-text-primary">{row.fullName}</div>
                                <div className="text-xs text-text-secondary mt-0.5">{row.registrationNumber}</div>
                              </td>
                              <td className="py-4 px-6 text-sm text-text-secondary font-medium">
                                {row.classId?.name || 'N/A'} / {row.sectionId?.name || 'N/A'}
                              </td>
                              <td className="py-4 px-6 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-text-primary">{row.fatherContact}</span>
                                  <button
                                    onClick={() => handleCopyContact(row.studentId, row.fatherContact, row.fullName)}
                                    title="Copy Contact"
                                    className="p-1.5 hover:bg-background rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                                  >
                                    {copiedRowId === row.studentId ? (
                                      <Check className="h-3.5 w-3.5 text-success" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                                <div className="text-[10px] text-text-secondary mt-0.5">Father: {row.fatherName}</div>
                              </td>
                              <td className="py-4 px-6 text-sm text-text-secondary font-semibold">{formatCurrency(row.amountDue)}</td>
                              <td className="py-4 px-6 text-sm text-text-secondary font-semibold">{formatCurrency(row.amountPaid)}</td>
                              <td className="py-4 px-6 text-sm font-extrabold text-danger">{formatCurrency(row.outstandingAmount)}</td>
                              <td className="py-4 px-6 text-sm text-text-secondary/70">{formatDate(row.dueDate)}</td>
                              <td className="py-4 px-6 text-sm text-center">
                                <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2 CONTENT: ATTENDANCE SUMMARY --- */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Filter Date Picker Card */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
              <div className="flex items-center space-x-2 text-gray-400 mb-3.5">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Configure Date Range</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-navy-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-navy-900"
                  />
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-8 w-8 text-navy-900 animate-spin" />
                  <span className="text-sm font-semibold text-gray-500">Loading attendance data...</span>
                </div>
              ) : attendanceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12">
                  <div className="h-16 w-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-950">No Attendance Records</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">No attendance data for this date range yet.</p>
                </div>
              ) : (
                <div>
                  {/* Stacked Cards for Mobile */}
                  <div className="block sm:hidden divide-y divide-border">
                    {attendanceData.map((row) => (
                      <div key={`${row.classId}-${row.sectionId}`} className="p-4 space-y-3 bg-surface hover:bg-background/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary text-sm">
                            {row.className} - {row.sectionName}
                          </span>
                          <span className="text-xs font-extrabold text-text-primary">
                            Avg: {row.averageAttendancePercentage}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-text-secondary block">Total Days</span>
                            <span className="font-semibold text-text-primary">{row.totalDaysRecorded} days</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-text-secondary block">Total Records</span>
                            <span className="font-semibold text-text-primary">{row.totalRecordsMarked || row.totalRecords}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex flex-col space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] uppercase font-bold text-text-secondary">Progress</span>
                            {row.averageAttendancePercentage < 75 && (
                              <span className="flex items-center text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-lg gap-1 animate-pulse select-none">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Low (&lt;75%)</span>
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-border">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${row.averageAttendancePercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Table for Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-background border-b border-border">
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Class / Section</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Total Days Recorded</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Total Individual Records</th>
                          <th className="py-3 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Average Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attendanceData.map((row, idx) => (
                          <tr key={`${row.classId}-${row.sectionId}`} className="hover:bg-background/40 transition-colors">
                            <td className="py-4 px-6 text-sm font-bold text-text-primary">
                              {row.className} - {row.sectionName}
                            </td>
                            <td className="py-4 px-6 text-sm text-text-secondary font-semibold">
                              {row.totalDaysRecorded} days
                            </td>
                            <td className="py-4 px-6 text-sm text-text-secondary/70">
                              {row.totalRecordsMarked || row.totalRecords}
                            </td>
                            <td className="py-4 px-6 text-sm">
                              <div className="flex items-center space-x-3">
                                <span className="font-extrabold text-text-primary min-w-[40px]">
                                  {row.averageAttendancePercentage}%
                                </span>
                                <div className="w-32 bg-background h-2 rounded-full overflow-hidden border border-border">
                                  <div
                                    className="bg-primary h-full rounded-full transition-all duration-300"
                                    style={{ width: `${row.averageAttendancePercentage}%` }}
                                  />
                                </div>
                                {row.averageAttendancePercentage < 75 && (
                                  <span className="flex items-center text-xs font-bold text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-lg gap-1 animate-pulse select-none">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>Low (&lt;75%)</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminReports;
