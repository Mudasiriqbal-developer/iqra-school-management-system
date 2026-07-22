import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Award, CalendarCheck, DollarSign, LayoutDashboard, BarChart3, 
  Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
  AlertTriangle, BookOpen, Wallet, TrendingUp, MailPlus, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import { getTeachers, deleteTeacher, resendInvitation } from '../features/teachers/teacherService';
import api from '../services/api';
import TeacherFormModal from '../features/teachers/TeacherFormModal';
import TeacherViewDrawer from '../features/teachers/TeacherViewDrawer';
import AssignmentFormModal from '../features/teachers/AssignmentFormModal';

const AdminTeachers = () => {
  // Navigation items for the Sidebar (sync path for Faculty to /admin/teachers)
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
  const [teachers, setTeachers] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 10;

  const [dropdownCoords, setDropdownCoords] = useState(null);

  const handleKebabClick = (e, teacherId) => {
    e.stopPropagation();
    if (activeDropdownId === teacherId) {
      setActiveDropdownId(null);
      setDropdownCoords(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveDropdownId(teacherId);
      setDropdownCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom
      });
    }
  };

  // Selected entities & Modal states
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  
  // Deactivation confirmation modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Main data loader
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [teachersRes, assignmentsRes] = await Promise.all([
        getTeachers(),
        api.get('/assignments')
      ]);

      if (teachersRes.success) {
        setTeachers(teachersRes.data || []);
      }
      if (assignmentsRes.data?.success) {
        setAssignments(assignmentsRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load faculty records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleOpenAdd = () => {
    setSelectedTeacher(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleOpenView = (teacher) => {
    setSelectedTeacher(teacher);
    setIsViewOpen(true);
  };

  const handleOpenAssign = (teacher) => {
    setSelectedTeacher(teacher);
    setIsAssignOpen(true);
  };

  const handleOpenDeleteConfirm = (teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    try {
      const res = await deleteTeacher(teacherToDelete._id);
      if (res.success) {
        toast.success(`Successfully deactivated ${teacherToDelete.userId?.name}`);
        fetchData();
      } else {
        toast.error(res.message || 'Deactivation failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred during deactivation');
    } finally {
      setIsDeleteConfirmOpen(false);
      setTeacherToDelete(null);
    }
  };

  const handleResendInvitation = async (teacherId) => {
    try {
      const res = await resendInvitation(teacherId);
      if (res.success) {
        toast.success('Invitation resent');
        fetchData();
      } else {
        toast.error(res.message || 'Failed to resend invitation');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred during resend');
    }
  };

  // Helper mapping helper for teacher status to StatusBadge
  const getStatusBadgeProps = (userObj) => {
    if (!userObj) return { status: 'default', label: 'Unknown' };

    if (userObj.isActive === false) {
      return { status: 'danger', label: 'Deactivated' };
    }

    if (userObj.isActivated) {
      return { status: 'active', label: 'Active' };
    }

    const expires = userObj.activationTokenExpires ? new Date(userObj.activationTokenExpires) : null;
    const isExpired = expires ? expires < new Date() : true;

    if (isExpired) {
      return { status: 'danger', label: 'Invitation Expired' };
    }

    return { status: 'pending', label: 'Invitation Pending' };
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'TC';
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Client-side search filtration
  const filteredTeachers = teachers.filter((teacher) => {
    const searchLower = debouncedSearch.toLowerCase().trim();
    if (!searchLower) return true;
    const nameMatch = teacher.userId?.name?.toLowerCase().includes(searchLower);
    const empMatch = teacher.employeeId?.toLowerCase().includes(searchLower);
    return nameMatch || empMatch;
  });

  // Pagination computations
  const totalItems = filteredTeachers.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedTeachers = filteredTeachers.slice((page - 1) * limit, page * limit);
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

  // Statistics Computations
  const totalTeachersCount = teachers.length;
  const fullyAssignedCount = teachers.filter(t => 
    assignments.some(a => (a.teacherId?._id || a.teacherId) === t._id)
  ).length;
  const unassignedCount = teachers.filter(t => 
    !assignments.some(a => (a.teacherId?._id || a.teacherId) === t._id)
  ).length;

  return (
    <DashboardLayout
      navItems={navItems}
      subtitle="Administrative Suite"
    >
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Teacher Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage faculty profiles and class assignments.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="bg-navy-900 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 hover:bg-navy-800 transition-colors shadow-sm text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Teacher</span>
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
          <div className="w-full md:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 text-xs bg-gray-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Teacher Records Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-navy-900"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading faculty records...</span>
            </div>
          ) : paginatedTeachers.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold text-sm">No teacher records found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search queries.</p>
            </div>
          ) : (
            <div>
              {/* Stacked Cards for Mobile */}
              <div className="block sm:hidden divide-y divide-border">
                {paginatedTeachers.map((teacher) => {
                  const statusProps = getStatusBadgeProps(teacher.userId);
                  const teacherAsgs = assignments.filter(
                    (a) => (a.teacherId?._id || a.teacherId) === teacher._id
                  );
                  const colors = [
                    'bg-blue-600 text-blue-100',
                    'bg-purple-600 text-purple-100',
                    'bg-emerald-600 text-emerald-100',
                    'bg-amber-600 text-amber-100',
                    'bg-pink-600 text-pink-100',
                    'bg-indigo-600 text-indigo-100'
                  ];
                  const colorIndex = (teacher.userId?.name || '').length % colors.length;
                  const avatarBg = colors[colorIndex];

                  return (
                    <div key={teacher._id} className="p-4 space-y-3 bg-surface hover:bg-background/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-subtle ${avatarBg}`}>
                            {getInitials(teacher.userId?.name)}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-sm">{teacher.userId?.name || 'N/A'}</div>
                            <div className="text-xs text-text-secondary font-semibold mt-0.5">{teacher.employeeId}</div>
                          </div>
                        </div>

                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => handleKebabClick(e, teacher._id)}
                            className="p-2 text-text-secondary hover:text-text-primary hover:bg-background rounded-btn transition-all outline-none"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {activeDropdownId === teacher._id && dropdownCoords && createPortal(
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
                                    {teacher.userId?.isActivated === false && teacher.userId?.isActive !== false && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          setDropdownCoords(null);
                                          handleResendInvitation(teacher._id);
                                        }}
                                        className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                      >
                                        <MailPlus className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                        Resend Invite
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleOpenView(teacher);
                                      }}
                                      className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                    >
                                      <Eye className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                      View Profile
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleOpenEdit(teacher);
                                      }}
                                      className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                    >
                                      <Pencil className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                      Edit Profile
                                    </button>
                                  </div>
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownCoords(null);
                                        handleOpenDeleteConfirm(teacher);
                                      }}
                                      disabled={teacher.userId?.isActive === false}
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
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase font-bold text-text-secondary block">Email</span>
                          <span className="font-semibold text-text-primary break-all">{teacher.userId?.email || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-text-secondary block">Qualification</span>
                          <span className="font-semibold text-text-primary truncate block max-w-xs">{teacher.qualification || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-text-secondary block">Assigned Classes</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {teacherAsgs.length > 0 ? (
                              teacherAsgs.map((asg) => (
                                <span key={asg._id} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                                  {asg.classId?.name || 'Class'}
                                </span>
                              ))
                            ) : (
                              <span className="text-text-secondary/70 italic">None</span>
                            )}
                          </div>
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
                      <th className="py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Teacher</th>
                      <th className="hidden md:table-cell py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Email</th>
                      <th className="hidden lg:table-cell py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Qualification</th>
                      <th className="hidden sm:table-cell py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Assigned Classes</th>
                      <th className="hidden sm:table-cell py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="py-3.5 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedTeachers.map((teacher) => {
                      const statusProps = getStatusBadgeProps(teacher.userId);
                      
                      const teacherAsgs = assignments.filter(
                        (a) => (a.teacherId?._id || a.teacherId) === teacher._id
                      );

                      const colors = [
                        'bg-blue-600 text-blue-100',
                        'bg-purple-600 text-purple-100',
                        'bg-emerald-600 text-emerald-100',
                        'bg-amber-600 text-amber-100',
                        'bg-pink-600 text-pink-100',
                        'bg-indigo-600 text-indigo-100'
                      ];
                      const colorIndex = (teacher.userId?.name || '').length % colors.length;
                      const avatarBg = colors[colorIndex];

                      return (
                        <tr key={teacher._id} className="hover:bg-background/40 transition-colors">
                          <td className="py-4 px-6 text-sm">
                            <div className="flex items-center space-x-3.5">
                              <div className="flex-shrink-0">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-subtle ${avatarBg}`}>
                                  {getInitials(teacher.userId?.name)}
                                </div>
                              </div>
                              <div>
                                <div className="font-bold text-text-primary flex items-center space-x-2">
                                  <span>{teacher.userId?.name || 'N/A'}</span>
                                  <span className={`inline-block sm:hidden h-2 w-2 rounded-full ${teacher.userId?.isActive === false ? 'bg-red-500' : teacher.userId?.isActivated ? 'bg-green-500' : 'bg-amber-500'}`} />
                                </div>
                                <div className="text-xs text-text-secondary font-semibold mt-0.5">{teacher.employeeId}</div>
                              </div>
                            </div>
                          </td>

                          <td className="hidden md:table-cell py-4 px-6 text-sm font-semibold text-text-secondary break-all">
                            {teacher.userId?.email || 'N/A'}
                          </td>

                          <td className="hidden lg:table-cell py-4 px-6 text-sm text-text-secondary font-medium max-w-xs truncate">
                            {teacher.qualification || 'N/A'}
                          </td>

                          <td className="hidden sm:table-cell py-4 px-6 text-sm">
                            {teacherAsgs.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {teacherAsgs.map((asg) => {
                                  const combo = `${asg.classId?.name || 'Class'} - ${asg.sectionId?.name || 'Sec'} - ${asg.subjectId?.name || 'Sub'}`;
                                  return (
                                    <span key={asg._id} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                      {combo}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-text-secondary/70 font-medium">Not Assigned</span>
                            )}
                          </td>

                          <td className="hidden sm:table-cell py-4 px-6 text-sm">
                            <StatusBadge status={statusProps.status} label={statusProps.label} />
                          </td>

                          <td className="py-4 px-6 text-sm text-right">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => handleKebabClick(e, teacher._id)}
                                className="p-2 text-text-secondary hover:text-text-primary hover:bg-background rounded-btn transition-all outline-none"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                              {activeDropdownId === teacher._id && dropdownCoords && createPortal(
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
                                        {teacher.userId?.isActivated === false && teacher.userId?.isActive !== false && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              setDropdownCoords(null);
                                              handleResendInvitation(teacher._id);
                                            }}
                                            className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                          >
                                            <MailPlus className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                            Resend Invite
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setDropdownCoords(null);
                                            handleOpenView(teacher);
                                          }}
                                          className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                        >
                                          <Eye className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                          View Profile
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setDropdownCoords(null);
                                            handleOpenEdit(teacher);
                                          }}
                                          className="flex w-full items-center px-4 py-3 text-sm font-bold text-text-primary hover:bg-background transition-colors text-left"
                                        >
                                          <Pencil className="h-4.5 w-4.5 text-text-secondary mr-3" />
                                          Edit Profile
                                        </button>
                                      </div>
                                      <div className="py-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownId(null);
                                            setDropdownCoords(null);
                                            handleOpenDeleteConfirm(teacher);
                                          }}
                                          disabled={teacher.userId?.isActive === false}
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
          {!loading && totalItems > 0 && (
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Showing {paginatedTeachers.length} of {totalItems} Teacher(s)
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
            label="Total Teachers"
            value={totalTeachersCount.toString()}
            trend="Faculty Count"
            trendColor="info"
          />
          <StatCard
            icon={Award}
            label="Fully Assigned Count"
            value={fullyAssignedCount.toString()}
            trend="Active Combos"
            trendColor="active"
          />
          <StatCard
            icon={AlertTriangle}
            label="Unassigned Count"
            value={unassignedCount.toString()}
            trend="Needs Assignment"
            trendColor={unassignedCount > 0 ? 'danger' : 'active'}
          />
        </div>

      </div>

      {/* Teacher Form Modal (Add / Edit) */}
      <TeacherFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
        onSuccess={fetchData}
      />

      {/* Teacher Detail Drawer */}
      <TeacherViewDrawer
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
        assignments={assignments.filter(
          (a) => (a.teacherId?._id || a.teacherId) === selectedTeacher?._id
        )}
        onRefresh={fetchData}
        onAddAssignment={(teacher) => {
          handleOpenAssign(teacher);
        }}
      />

      {/* Assignment Link Form Modal */}
      <AssignmentFormModal
        isOpen={isAssignOpen}
        onClose={() => {
          setIsAssignOpen(false);
        }}
        teacher={selectedTeacher}
        onSuccess={fetchData}
      />

      {/* Delete/Deactivate Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-6 overflow-hidden">
            <div className="flex items-center space-x-3 text-amber-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-navy-950">Confirm Deactivation</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate <span className="font-bold text-navy-950">{teacherToDelete?.userId?.name}</span>? This is a soft delete and will disable their account login. This can be reversed by an admin later.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setTeacherToDelete(null);
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
    </DashboardLayout>
  );
};

export default AdminTeachers;
