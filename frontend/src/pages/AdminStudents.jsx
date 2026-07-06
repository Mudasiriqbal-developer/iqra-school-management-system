import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Award, Calendar, DollarSign, LayoutDashboard, BarChart3, 
  Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight, 
  AlertTriangle, Filter, BookOpen, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

import { getStudents, deleteStudent, getClasses, getSectionsByClass } from '../features/students/studentService';
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
    { label: 'Attendance', icon: Calendar, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  // States
  const [students, setStudents] = useState([]);
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

  // Selected Student & Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Deactivation confirmation modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

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

  // Build pagination page array
  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

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
                  {c.name}
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Name / Reg</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Class / Section</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Father's Contact</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => {
                    const statusProps = getStatusBadgeProps(student.status);
                    
                    // Generate color palette index based on student name length
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
                      <tr key={student._id} className="hover:bg-gray-50/40 transition-colors">
                        {/* Student Photo */}
                        <td className="py-4 px-6 text-sm">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.fullName}
                              className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm"
                            />
                          ) : (
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-sm ${avatarBg}`}>
                              {getInitials(student.fullName)}
                            </div>
                          )}
                        </td>

                        {/* Name + Registration Number */}
                        <td className="py-4 px-6 text-sm">
                          <div className="font-bold text-navy-950">{student.fullName}</div>
                          <div className="text-xs text-gray-400 font-semibold mt-0.5">{student.registrationNumber}</div>
                        </td>

                        {/* Class / Section */}
                        <td className="py-4 px-6 text-sm">
                          <div className="font-bold text-gray-700">{student.classId?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-400 font-medium mt-0.5">{student.sectionId?.name || 'N/A'}</div>
                        </td>

                        {/* Father's Contact */}
                        <td className="py-4 px-6 text-sm font-semibold text-gray-600">
                          {student.fatherContact}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 text-sm">
                          <StatusBadge status={statusProps.status} label={statusProps.label} />
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-sm text-right">
                          <div className="flex items-center justify-end space-x-2.5">
                            <button
                              onClick={() => handleOpenView(student)}
                              title="View Details"
                              className="p-1.5 text-gray-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(student)}
                              title="Edit Record"
                              className="p-1.5 text-gray-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Pencil className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirm(student)}
                              title="Deactivate Student"
                              disabled={student.status === 'suspended'}
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
        onSuccess={fetchStudentsList}
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
    </DashboardLayout>
  );
};

export default AdminStudents;
