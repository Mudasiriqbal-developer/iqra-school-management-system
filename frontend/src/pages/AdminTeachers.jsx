import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Award, Calendar, CalendarCheck, DollarSign, LayoutDashboard, BarChart3, 
  Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
  AlertTriangle, BookOpen, Wallet, TrendingUp, CalendarClock, MailPlus
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
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 10;

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
  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Name / ID</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Qualification</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Classes</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedTeachers.map((teacher) => {
                    const statusProps = getStatusBadgeProps(teacher.userId);
                    
                    // Filter assignments for this teacher
                    const teacherAsgs = assignments.filter(
                      (a) => (a.teacherId?._id || a.teacherId) === teacher._id
                    );

                    // Generate color palette index based on teacher name length
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
                      <tr key={teacher._id} className="hover:bg-gray-50/40 transition-colors">
                        {/* Photo avatar */}
                        <td className="py-4 px-6 text-sm">
                          {teacher.photoUrl ? (
                            <img
                              src={teacher.photoUrl}
                              alt={teacher.userId?.name}
                              className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm"
                            />
                          ) : (
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-sm ${avatarBg}`}>
                              {getInitials(teacher.userId?.name)}
                            </div>
                          )}
                        </td>

                        {/* Name + Employee ID */}
                        <td className="py-4 px-6 text-sm">
                          <div className="font-bold text-navy-950">{teacher.userId?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-400 font-semibold mt-0.5">{teacher.employeeId}</div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-6 text-sm font-semibold text-gray-600 break-all">
                          {teacher.userId?.email || 'N/A'}
                        </td>

                        {/* Qualification */}
                        <td className="py-4 px-6 text-sm text-gray-500 font-medium max-w-xs truncate">
                          {teacher.qualification || 'N/A'}
                        </td>

                        {/* Assigned Classes */}
                        <td className="py-4 px-6 text-sm">
                          {teacherAsgs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {teacherAsgs.map((asg) => {
                                const combo = `${asg.classId?.name || 'Class'} - ${asg.sectionId?.name || 'Sec'} - ${asg.subjectId?.name || 'Sub'}`;
                                return (
                                  <span key={asg._id} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-navy-50 text-navy-800 border border-navy-100">
                                    {combo}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">Not Assigned</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 text-sm">
                          <StatusBadge status={statusProps.status} label={statusProps.label} />
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-sm text-right">
                          <div className="flex items-center justify-end space-x-2.5">
                            {teacher.userId?.isActivated === false && teacher.userId?.isActive !== false && (
                              <button
                                onClick={() => handleResendInvitation(teacher._id)}
                                title="Resend Activation Email"
                                className="p-1.5 text-gray-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <MailPlus className="h-4.5 w-4.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenView(teacher)}
                              title="View Profile Details"
                              className="p-1.5 text-gray-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(teacher)}
                              title="Edit Profile"
                              className="p-1.5 text-gray-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Pencil className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirm(teacher)}
                              title="Deactivate Teacher"
                              disabled={teacher.userId?.isActive === false}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                  {pagesArray.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        page === p
                          ? 'bg-navy-900 text-white shadow-sm'
                          : 'text-navy-950 hover:bg-gray-100 bg-white border border-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
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
