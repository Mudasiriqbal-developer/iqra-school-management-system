import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  CalendarCheck,
  BarChart3,
  Wallet,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  Calendar,
  Edit2,
  Trash2,
  DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import ConfirmModal from '../components/shared/ConfirmModal';

import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} from '../features/finance/financeService';

const CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'assets', label: 'Assets' },
  { value: 'other', label: 'Other' }
];

const AdminExpenses = () => {
  // Navigation sidebar configuration
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Expense Tracker', icon: TrendingDown, path: '/admin/expenses' },
    { label: 'Salary Payroll', icon: DollarSign, path: '/admin/payroll' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  // Filters State
  const [category, setCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination & Data List
  const [expenses, setExpenses] = useState([]);
  const [filteredTotalAmount, setFilteredTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null); // for editing

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger',
  });

  // Form State
  const [formState, setFormState] = useState({
    title: '',
    category: 'utilities',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paidTo: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch function
  const fetchExpensesData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        category: category || undefined,
        searchTerm: searchTerm.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      
      const res = await getExpenses(params);
      if (res.success) {
        setExpenses(res.data.expenses);
        setFilteredTotalAmount(res.data.filteredTotalAmount);
        setTotalCount(res.data.pagination.total);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load expense records');
    } finally {
      setLoading(false);
    }
  }, [category, searchTerm, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setSelectedExpense(null);
    setFormState({
      title: '',
      category: 'utilities',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      paidTo: ''
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (expense) => {
    setSelectedExpense(expense);
    setFormState({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
      description: expense.description || '',
      paidTo: expense.paidTo || ''
    });
    setIsModalOpen(true);
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.title || !formState.amount || !formState.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitLoading(true);
      if (selectedExpense) {
        // Edit Mode
        const res = await updateExpense(selectedExpense._id, formState);
        if (res.success) {
          toast.success('Expense updated successfully');
          setIsModalOpen(false);
          fetchExpensesData();
        }
      } else {
        // Add Mode
        const res = await createExpense(formState);
        if (res.success) {
          toast.success('Expense recorded successfully');
          setIsModalOpen(false);
          fetchExpensesData();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save expense record');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Expense Record',
      message: 'Are you sure you want to delete this expense record? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteExpense(id);
          if (res.success) {
            toast.success('Expense record deleted successfully');
            fetchExpensesData();
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to delete expense record');
        }
      }
    });
  };

  // Format Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryBadgeColor = (cat) => {
    switch (cat) {
      case 'rent': return 'danger'; // red
      case 'utilities': return 'warning'; // orange/yellow
      case 'salaries': return 'active'; // green
      case 'maintenance': return 'info'; // blue
      case 'stationery': return 'pending'; // amber
      case 'assets': return 'default'; // slate
      default: return 'default';
    }
  };

  const handleRefresh = () => {
    fetchExpensesData();
    toast.success('Expenses updated');
  };

  // Build pagination page array (collapsing pagination helper)
  const getPageNumbers = (currentPage, totalPages) => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Mudasir Iqbal"
      userRole="Administrator"
      subtitle="Administrative Suite"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Expense Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">
              Log, manage, and audit all school operations and facility expenses.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={handleOpenAdd}
              className="bg-[#00215E] text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 hover:opacity-90 transition-opacity shadow-sm text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Financial Stat Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={TrendingDown}
            label="Total Expenses (Filtered)"
            value={`Rs. ${filteredTotalAmount.toLocaleString()}`}
            trend="Active Outflow Summary"
            trendColor="danger"
          />
          <StatCard
            icon={Calendar}
            label="Filter Period Range"
            value={startDate || endDate ? `${startDate || 'Start'} to ${endDate || 'Today'}` : 'All-time Logs'}
            trend="Selected Date Range"
            trendColor="info"
          />
          <StatCard
            icon={Wallet}
            label="Logged Expenses Count"
            value={totalCount.toString()}
            trend="Audit Ledger Records"
            trendColor="pending"
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="w-full xl:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by title, description, vendor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] text-xs bg-gray-50 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Date & Category Filters */}
          <div className="w-full xl:w-auto flex flex-wrap gap-3 items-center justify-end">
            <div className="flex items-center space-x-1.5 text-gray-400">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Filters</span>
            </div>

            {/* Start Date */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 font-bold"
            />

            {/* End Date */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 font-bold"
            />

            {/* Category Dropdown */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 font-bold"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses List Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          {loading && expenses.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#00215E] border-t-transparent"></div>
              <p className="text-sm font-bold text-navy-950 mt-4">Loading ledger transactions...</p>
            </div>
          ) : expenses.length > 0 ? (
            <div>
              {/* Stacked Cards for Mobile */}
              <div className="block sm:hidden divide-y divide-border">
                {expenses.map((exp) => (
                  <div key={exp._id} className="p-4 space-y-3 bg-surface hover:bg-background/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary text-sm">{exp.title}</div>
                        {exp.description && (
                          <div className="text-xs text-text-secondary mt-0.5 max-w-xs truncate">
                            {exp.description}
                          </div>
                        )}
                      </div>
                      <StatusBadge
                        status={getCategoryBadgeColor(exp.category)}
                        label={exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-text-secondary block">Amount</span>
                        <span className="font-bold text-danger">Rs. {exp.amount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-text-secondary block">Date Logged</span>
                        <span className="font-semibold text-text-primary">{formatDate(exp.date)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-bold text-text-secondary block">Recipient / Paid To</span>
                        <span className="font-semibold text-text-primary">{exp.paidTo || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/50">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        title="Edit Record"
                        className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-background border border-border rounded-btn transition-all"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(exp._id)}
                        title="Delete Record"
                        className="p-1.5 text-danger hover:bg-danger/10 border border-danger/25 rounded-btn transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table for Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Expense Details</th>
                      <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Category</th>
                      <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Amount</th>
                      <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Date Logged</th>
                      <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Recipient / Paid To</th>
                      <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-background/40 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-text-primary">{exp.title}</div>
                            {exp.description && (
                              <div className="text-xxs text-text-secondary font-medium mt-0.5 max-w-xs truncate">
                                {exp.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge
                            status={getCategoryBadgeColor(exp.category)}
                            label={exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}
                          />
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-danger text-sm">
                          Rs. {exp.amount?.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-sm text-text-secondary font-medium">
                          {formatDate(exp.date)}
                        </td>
                        <td className="py-4 px-6 text-sm font-semibold text-text-primary">
                          {exp.paidTo || 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(exp)}
                              title="Edit Record"
                              className="p-2 text-primary hover:bg-background rounded-btn transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(exp._id)}
                              title="Delete Record"
                              className="p-2 text-danger hover:text-danger/90 hover:bg-danger/10 rounded-btn transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center bg-slate-50 border border-dashed border-gray-150 rounded-b-2xl m-4">
              <p className="text-sm text-gray-400 italic">No logged expenses found matching criteria.</p>
            </div>
          )}

          {/* Pagination */}
          {!loading && expenses.length > 0 && (
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Showing {expenses.length} of {totalCount} Ledger Transaction(s)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-45 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center space-x-1">
                  {getPageNumbers(page, totalPages).map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span 
                          key={`dots-${idx}`} 
                          className="px-2 py-1.5 text-xs font-bold text-gray-400 dark:text-slate-500"
                        >
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          page === p
                            ? 'bg-[#00215E] text-white shadow-sm dark:bg-sky-500 dark:text-slate-950'
                            : 'text-navy-primary hover:bg-gray-100 bg-white border border-gray-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-750'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-45 disabled:hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record/Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-extrabold text-navy-950 text-base">
                {selectedExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Expense Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formState.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Electricity Bill July"
                  className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formState.category}
                    onChange={handleFormChange}
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-semibold"
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formState.amount}
                    onChange={handleFormChange}
                    placeholder="e.g. 15000"
                    min="0"
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formState.date}
                    onChange={handleFormChange}
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-medium"
                    required
                  />
                </div>

                {/* Recipient */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Paid To / Recipient
                  </label>
                  <input
                    type="text"
                    name="paidTo"
                    value={formState.paidTo}
                    onChange={handleFormChange}
                    placeholder="e.g. K-Electric, Landlord"
                    className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={handleFormChange}
                  placeholder="Additional context/notes on this expenditure..."
                  rows="3"
                  className="block w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 text-xs font-medium resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2 bg-[#00215E] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitLoading ? 'Saving...' : selectedExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </DashboardLayout>
  );
};

export default AdminExpenses;
