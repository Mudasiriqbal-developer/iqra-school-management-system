import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Award, CalendarCheck, DollarSign, LayoutDashboard, BarChart3, 
  Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
  AlertTriangle, Filter, BookOpen, Wallet, TrendingUp, Key, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import { getStudents, deleteStudent, getClasses, getSectionsByClass, downloadAdmissionReceipt, resetStudentPassword } from '../features/students/studentService';
import StudentFormModal from '../features/students/StudentFormModal';
import StudentViewDrawer from '../features/students/StudentViewDrawer';

const AdminStudents = () => {
  // Navigation items for the Sidebar
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

  // States
  const [students, setStudents] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [dropdownCoords, setDropdownCoords] = useState(null);

  const handleKebabClick = (e, studentId) => {
    e.stopPropagation();
    if (activeDropdownId === studentId) {
      setActiveDropdownId(null);
      setDropdownCoords(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveDropdownId(studentId);
      setDropdownCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom
      });
    }
  };

  // Selected Student & Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Deactivation confirmation modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Reset password modal states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [studentToResetPassword, setStudentToResetPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('student123');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Receipt download confirmation modal states
  const [isReceiptConfirmOpen, setIsReceiptConfirmOpen] = useState(false);
  const [createdStudentForReceipt, setCreatedStudentForReceipt] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classId, sectionId, status]);

  // Load classes on mount
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

  // Load sections when class selection changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!classId) {
        setSectionsList([]);
        return;
      }
      try {
        const res = await getSectionsByClass(classId);
        if (res.success) {
          setSectionsList(res.data);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
      }
    };
    fetchSections();
  }, [classId]);

  // Main fetch effect
  const fetchStudentsList = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        status: status || undefined
      };

      const res = await getStudents(params);
      if (res.success) {
        setStudents(res.data.students);
        setTotalStudents(res.data.total);
        setTotalPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Failed to load student records');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, classId, sectionId, status, page]);

  useEffect(() => {
    fetchStudentsList();
  }, [fetchStudentsList]);

  // Handlers
  const handleOpenAdd = () => {
    setSelectedStudent(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setIsFormOpen(true);
  };

  const handleOpenView = (student) => {
    setSelectedStudent(student);
    setIsViewOpen(true);
  };

  const handleOpenDeleteConfirm = (student) => {
    setStudentToDelete(student);
    setIsDeleteConfirmOpen(true);
  };

  const handleFormSuccess = async (createdStudent) => {
    fetchStudentsList();
    if (!selectedStudent && createdStudent) {
      const hasAdmission = 
        (createdStudent.admissionTotal || 0) > 0 ||
        (createdStudent.admissionFee || 0) > 0 ||
        (createdStudent.books && createdStudent.books.length > 0) ||
        !!createdStudent.admissionPaymentStatus;
      if (hasAdmission) {
        setCreatedStudentForReceipt(createdStudent);
        setIsReceiptConfirmOpen(true);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    try {
      const res = await deleteStudent(studentToDelete._id);
      if (res.success) {
        toast.success(`Successfully deactivated ${studentToDelete.fullName}`);
        fetchStudentsList();
      } else {
        toast.error(res.message || 'Deactivation failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred during deactivation');
    } finally {
      setIsDeleteConfirmOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleOpenResetModal = (student) => {
    setStudentToResetPassword(student);
    setNewPassword('student123'); // Default to student123
    setIsResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!studentToResetPassword) return;

    if (!newPassword || newPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await resetStudentPassword(studentToResetPassword._id, newPassword);
      if (res.success) {
        toast.success(res.message || `Password reset successfully for ${studentToResetPassword.fullName}`);
        setIsResetModalOpen(false);
      } else {
        toast.error(res.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred during password reset');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Helper mapping helper for student status to StatusBadge status
  const getStatusBadgeProps = (studentStatus) => {
    switch (studentStatus) {
      case 'active':
        return { status: 'active', label: 'Active' };
      case 'on_leave':
        return { status: 'pending', label: 'On Leave' };
      case 'suspended':
        return { status: 'danger', label: 'Suspended' };
      default:
        return { status: 'default', label: studentStatus || 'Unknown' };
    }
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Stats Card Calculations
  const pendingFeeCount = students.filter(s => s.feeInfo?.status !== 'paid').length;

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
      subtitle="Administrative Suite"
    >
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Student Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and monitor student records across the school.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="bg-navy-900 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 hover:bg-navy-800 transition-colors shadow-sm text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Left Side: Search */}
          <div className="w-full md:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name or reg no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 text-xs bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          {/* Right Side: Selects */}
          <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap gap-3 items-center justify-end">
            <div className="flex items-center space-x-1.5 text-gray-400">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Filters</span>
            </div>

            {/* Class Dropdown */}
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-700/50"
            >
              <option value="">All Classes</option>
              {classesList.map((c) => (
                <option key={c._id} value={c._id}>
                  {/^\d+$/.test(c.name) ? 'Class ' : ''}{c.name} — {c.gender ? c.gender.charAt(0).toUpperCase() + c.gender.slice(1) : 'Mixed'}
                </option>
              ))}
            </select>

            {/* Section Dropdown */}
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!classId}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-700/50 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {!classId ? 'Select class first' : 'All Sections'}
              </option>
              {sectionsList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy-700/50"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Student Records Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-navy-900"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold text-sm">No student records found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search queries.</p>
            </div>
          ) : (
            <div>
              {/* Stacked Cards for Mobile */}
              <div className="block sm:hidden divide-y divide-border">
                {students.map((student) => {
                  const statusProps = getStatusBadgeProps(student.status);
                  const colors = [
                    'bg-blue-600 text-blue-100',
                    'bg-purple-600 text-purple-100',
                    'bg-emerald-600 text-emerald-100',
                    'bg-amber-600 text-amber-100',
                    'bg-pink-600 text-pink-100',
                    'bg-indigo-600 text-indigo-100'
                  ];
                  const colorIndex = (student.fullName || '').length % colors.length;
                  const avatarBg = colors[colorIndex];

                  return (
                    <div key={student._id} className="p-4 space-y-3 bg-surface hover:bg-background/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-subtle ${avatarBg}`}>
                            {getInitials(student.fullName)}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-sm">{student.fullName}</div>
                            <div className="text-xs text-text-secondary font-semibold mt-0.5">Reg: {student.registrationNumber}</div>
                          </div>
                        </div>
                        
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => handleKebabClick(e, student._id)}
                            className="p-2 text-text-secondary hover:text-text-primary hover:bg-background rounded-btn transition-all outline-none"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {activeDropdownId === student._id && dropdownCoords && createPortal(
                            <>
                              <div 
                                className="fixed inset-0 z-40"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setDropdownCoords(null);
                                }}
                              />
                              <div 
                                style={{
                                  position: 'absolute',
                                  top: dropdownCoords.top,
                                  left: dropdownCoords.left,
                                  width: dropdownCoords.width,
                                  height: dropdownCoords.height,
                                  pointerEvents: 'none'
                                }}
                                className="z-50"
                              >
                                <div 
                                  style={{ pointerEvents: 'auto' }}
                                  className={`absolute right-0 w-52 bg-white border border-border rounded-card shadow-xl py-1.5 divide-y divide-border ${
                                    dropdownCoords.bottom + 220 > window.innerHeight ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                  }`}
                                >
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleOpenView(student);
                                      }}
                                      className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                    >
                                      <Eye className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                      View Details
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleOpenEdit(student);
                                      }}
                                      className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                    >
                                      <Pencil className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                      Edit Record
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleOpenResetModal(student);
                                      }}
                                      className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                    >
                                      <Key className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                      Reset Password
                                    </button>
                                  </div>
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleOpenDeleteConfirm(student);
                                      }}
                                      disabled={student.status === 'suspended'}
                                      className="flex w-full items-center px-4 py-3 text-sm font-bold text-danger hover:bg-danger/10 transition-colors text-left disabled:opacity-40"
                                    >
                                      <Trash2 className="h-4.5 w-4.5 text-danger mr-3" />
                                      Deactivate
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-text-secondary block">Class / Section</span>
                          <span className="font-semibold text-text-primary">
                            {student.classId
                              ? student.classId.name + ' - ' + (student.sectionId?.name || 'N/A')
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-text-secondary block">Father's Contact</span>
                          <span className="font-semibold text-text-primary">{student.fatherContact}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-[10px] uppercase font-bold text-text-secondary">Status</span>
                        <StatusBadge status={statusProps.status} label={statusProps.label} />
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
                      <th className="py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Student</th>
                      <th className="py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Class / Section</th>
                      <th className="hidden md:table-cell py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Father's Contact</th>
                      <th className="hidden sm:table-cell py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.map((student) => {
                      const statusProps = getStatusBadgeProps(student.status);
                      
                      const colors = [
                        'bg-blue-600 text-blue-100',
                        'bg-purple-600 text-purple-100',
                        'bg-emerald-600 text-emerald-100',
                        'bg-amber-600 text-amber-100',
                        'bg-pink-600 text-pink-100',
                        'bg-indigo-600 text-indigo-100'
                      ];
                      const colorIndex = (student.fullName || '').length % colors.length;
                      const avatarBg = colors[colorIndex];

                      return (
                        <tr key={student._id} className="hover:bg-background/40 transition-colors">
                          <td className="py-4 px-6 text-sm">
                            <div className="flex items-center space-x-3.5">
                              <div className="flex-shrink-0">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-subtle ${avatarBg}`}>
                                  {getInitials(student.fullName)}
                                </div>
                              </div>
                              <div>
                                <div className="font-bold text-text-primary flex items-center space-x-2">
                                  <span>{student.fullName}</span>
                                  <span className={`inline-block sm:hidden h-2 w-2 rounded-full ${student.status === 'active' ? 'bg-green-500' : student.status === 'on_leave' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                </div>
                                <div className="text-xs text-text-secondary font-semibold mt-0.5">{student.registrationNumber}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-sm">
                            <div className="font-bold text-text-primary">
                              {student.classId
                                ? (/^\d+$/.test(student.classId.name) ? 'Class ' : '') + 
                                  student.classId.name + 
                                  (student.classId.gender && student.classId.gender !== 'mixed' 
                                    ? ` — ${student.classId.gender.charAt(0).toUpperCase() + student.classId.gender.slice(1)}` 
                                    : '')
                                : 'N/A'}
                            </div>
                            <div className="text-xs text-text-secondary font-medium mt-0.5">{student.sectionId?.name || 'N/A'}</div>
                          </td>

                          <td className="hidden md:table-cell py-4 px-6 text-sm font-semibold text-text-secondary">
                            {student.fatherContact}
                          </td>

                          <td className="hidden sm:table-cell py-4 px-6 text-sm">
                            <StatusBadge status={statusProps.status} label={statusProps.label} />
                          </td>

                          <td className="py-4 px-6 text-sm text-right">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => handleKebabClick(e, student._id)}
                                className="p-2 text-text-secondary hover:text-text-primary hover:bg-background rounded-btn transition-all outline-none"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                              {activeDropdownId === student._id && dropdownCoords && createPortal(
                                <>
                                  <div 
                                    className="fixed inset-0 z-40"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setDropdownCoords(null);
                                    }}
                                  />
                                  <div 
                                    style={{
                                      position: 'absolute',
                                      top: dropdownCoords.top,
                                      left: dropdownCoords.left,
                                      width: dropdownCoords.width,
                                      height: dropdownCoords.height,
                                      pointerEvents: 'none'
                                    }}
                                    className="z-50"
                                  >
                                    <div 
                                      style={{ pointerEvents: 'auto' }}
                                      className={`absolute right-0 w-52 bg-white border border-border rounded-card shadow-xl py-1.5 divide-y divide-border ${
                                        dropdownCoords.bottom + 220 > window.innerHeight ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                      }`}
                                    >
                                      <div className="py-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setDropdownCoords(null);
                                            handleOpenView(student);
                                          }}
                                          className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                        >
                                          <Eye className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                          View Details
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setDropdownCoords(null);
                                            handleOpenEdit(student);
                                          }}
                                          className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                        >
                                          <Pencil className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                          Edit Record
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setDropdownCoords(null);
                                            handleOpenResetModal(student);
                                          }}
                                          className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                        >
                                          <Key className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                          Reset Password
                                        </button>
                                      </div>
                                      <div className="py-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setDropdownCoords(null);
                                            handleOpenDeleteConfirm(student);
                                          }}
                                          disabled={student.status === 'suspended'}
                                          className="flex w-full items-center px-4 py-3 text-sm font-bold text-danger hover:bg-danger/10 transition-colors text-left disabled:opacity-40"
                                        >
                                          <Trash2 className="h-4.5 w-4.5 text-danger mr-3" />
                                          Deactivate
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </>,
                                document.body
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table Footer / Pagination */}
          {!loading && students.length > 0 && (
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Showing {students.length} of {totalStudents} Student(s)
              </span>

              <div className="flex items-center space-x-2">
                {/* Prev Button */}
                <button
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-45 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {getPageNumbers(page, totalPages).map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span 
                          key={`dots-${idx}`} 
                          className="px-2 py-1 text-xs font-bold text-gray-400 dark:text-slate-500"
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
                            ? 'bg-navy-900 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950'
                            : 'text-navy-950 hover:bg-gray-100 bg-white border border-gray-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-750'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="p-2 border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-45 disabled:hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Summary Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          <StatCard
            icon={Users}
            label="Total Students"
            value={totalStudents.toString()}
            trend="Active View"
            trendColor="info"
          />
          <StatCard
            icon={Award}
            label="Active Today (Overall)"
            value={totalStudents.toString()}
            trend="100%"
            trendColor="active"
          />
          <StatCard
            icon={DollarSign}
            label="Pending Fee Count (Page)"
            value={pendingFeeCount.toString()}
            trend="Needs Attention"
            trendColor={pendingFeeCount > 0 ? 'danger' : 'active'}
          />
        </div>

      </div>

      {/* Modals & Popups */}
      
      {/* Student Form Modal (Add / Edit) */}
      <StudentFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={handleFormSuccess}
      />

      {/* Student Detail Viewer Modal */}
      <StudentViewDrawer
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 overflow-hidden">
            <div className="flex items-center space-x-3 text-amber-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-navy-950">Confirm Deactivation</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate <span className="font-bold text-navy-900">{studentToDelete?.fullName}</span>? This can be reversed by an admin later.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Student Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 overflow-hidden">
            <div className="flex items-center space-x-3 text-navy-900 mb-4">
              <Key className="h-6 w-6" />
              <h3 className="text-lg font-bold text-navy-950">Reset Student Password</h3>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <p className="text-sm text-gray-500">
                Set a new password for <span className="font-bold text-navy-900">{studentToResetPassword?.fullName}</span> (Roll No: {studentToResetPassword?.registrationNumber}).
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="block w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 bg-gray-50 focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setNewPassword('student123')}
                  className="text-xs font-semibold text-navy-800 hover:text-navy-700 transition-colors"
                >
                  Reset to Default (student123)
                </button>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setStudentToResetPassword(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                  disabled={isResettingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center"
                >
                  {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Download Confirmation Modal */}
      {isReceiptConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 overflow-hidden">
            <div className="flex items-center space-x-3 text-navy-900 mb-4">
              <BookOpen className="h-6 w-6" />
              <h3 className="text-lg font-bold text-navy-950">Download Receipt?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Do you want to download the admission receipt for <span className="font-bold text-navy-900">{createdStudentForReceipt?.fullName}</span>?
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setIsReceiptConfirmOpen(false);
                  setCreatedStudentForReceipt(null);
                }}
                className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                No
              </button>
              <button
                onClick={async () => {
                  if (!createdStudentForReceipt) return;
                  const student = createdStudentForReceipt;
                  setIsReceiptConfirmOpen(false);
                  setCreatedStudentForReceipt(null);
                  
                  const remaining = (student.admissionTotal || 0) - (student.admissionAmountPaid || 0);
                  const toastMsg = remaining > 0
                    ? `Student created — admission receipt downloading. Rs. ${remaining} added as an outstanding due.`
                    : 'Student created — admission receipt downloading.';

                  const toastId = toast.loading(toastMsg);
                  try {
                    await downloadAdmissionReceipt(student._id, student.registrationNumber);
                    toast.success('Admission receipt downloaded successfully!', { id: toastId });
                  } catch (err) {
                    console.error(err);
                    toast.error('Failed to download admission receipt.', { id: toastId });
                  }
                }}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminStudents;
