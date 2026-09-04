import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, HelpCircle, LogOut, Menu, Sun, Moon, Loader2, User, GraduationCap, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const Navbar = ({ 
  userName = "Admin User", 
  userRole = "Administrator", 
  userAvatar = "", 
  isCollapsed = false, 
  onToggleCollapse, 
  onToggleSidebar, 
  onLogoutClick 
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ students: [], teachers: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      logout();
    }
  };

  // Debounced Live Search for Students and Teachers
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults({ students: [], teachers: [] });
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const [studentsRes, teachersRes] = await Promise.all([
          api.get(`/students?search=${encodeURIComponent(trimmed)}&limit=5`).catch(() => ({ data: { success: false } })),
          api.get(`/teachers?search=${encodeURIComponent(trimmed)}&limit=5`).catch(() => ({ data: { success: false } }))
        ]);

        const foundStudents = studentsRes.data?.success ? (studentsRes.data.data.students || []) : [];
        const foundTeachers = teachersRes.data?.success ? (teachersRes.data.data.teachers || teachersRes.data.data || []) : [];

        setSearchResults({
          students: Array.isArray(foundStudents) ? foundStudents.slice(0, 5) : [],
          teachers: Array.isArray(foundTeachers) ? foundTeachers.slice(0, 5) : []
        });
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Navbar search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prefer AuthContext data, fallback to props
  const name = user?.name || userName;
  const role = user?.role || userRole;

  // Format roles for display
  const formattedRole = role === 'admin'
    ? 'Administrator'
    : role === 'teacher'
    ? 'Faculty Member'
    : role === 'student'
    ? 'Student'
    : role;

  // Colors avatar
  const colors = [
    'bg-blue-600 text-blue-100',
    'bg-purple-600 text-purple-100',
    'bg-emerald-600 text-emerald-100',
    'bg-amber-600 text-amber-100',
    'bg-pink-600 text-pink-100',
    'bg-indigo-600 text-indigo-100'
  ];
  const colorIndex = name.length % colors.length;
  const avatarBg = colors[colorIndex];
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSelectStudent = (student) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    if (user?.role === 'admin') {
      navigate(`/admin/students?search=${encodeURIComponent(student.fullName || student.name)}`);
    } else {
      navigate('/student/schedule');
    }
  };

  const handleSelectTeacher = (teacher) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    if (user?.role === 'admin') {
      navigate(`/admin/teachers?search=${encodeURIComponent(teacher.fullName || teacher.name)}`);
    }
  };

  const totalResults = searchResults.students.length + searchResults.teachers.length;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 right-0 z-30 w-full transition-colors duration-200">
      {/* Left: Menu toggle & Live Search */}
      <div className="flex items-center space-x-3 flex-1 min-w-0 mr-4">
        <button
          onClick={() => {
            if (window.innerWidth >= 1024 && onToggleCollapse) {
              onToggleCollapse();
            } else if (onToggleSidebar) {
              onToggleSidebar();
            }
          }}
          className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-all focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="w-full max-w-[180px] xs:max-w-[240px] sm:max-w-xs relative" ref={dropdownRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-navy-700 dark:text-sky-400" /> : <Search className="h-4 w-4" />}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setIsDropdownOpen(true)}
              placeholder="Search students, faculty..."
              className="block w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-900/30 focus:border-navy-900 text-xs bg-slate-50 dark:bg-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setIsDropdownOpen(false); }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 max-h-96 overflow-y-auto animate-modal-zoom">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-slate-400 flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-navy-900 dark:text-sky-400" />
                  <span>Searching directory...</span>
                </div>
              ) : totalResults === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-slate-400">
                  No matching students or faculty found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {/* Students Section */}
                  {searchResults.students.length > 0 && (
                    <div className="py-1">
                      <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40 flex items-center space-x-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
                        <span>Students ({searchResults.students.length})</span>
                      </div>
                      {searchResults.students.map((st) => (
                        <button
                          key={st._id || st.id}
                          onClick={() => handleSelectStudent(st)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between transition-colors group"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-navy-900 dark:group-hover:text-sky-400">
                              {st.fullName || st.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Reg #: {st.registrationNumber || st.rollNumber || 'N/A'} {st.classId?.name ? `• ${st.classId.name}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] bg-navy-50 text-navy-900 dark:bg-sky-950/40 dark:text-sky-400 px-2 py-0.5 rounded-md font-bold border border-navy-100/60 dark:border-sky-900/40">
                            Student
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Teachers Section */}
                  {searchResults.teachers.length > 0 && (
                    <div className="py-1">
                      <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40 flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Faculty ({searchResults.teachers.length})</span>
                      </div>
                      {searchResults.teachers.map((tc) => (
                        <button
                          key={tc._id || tc.id}
                          onClick={() => handleSelectTeacher(tc)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between transition-colors group"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-navy-900 dark:group-hover:text-sky-400">
                              {tc.fullName || tc.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Emp #: {tc.employeeId || 'N/A'} {tc.qualification ? `• ${tc.qualification}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-100/60 dark:border-emerald-900/40">
                            Faculty
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Tools and Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        {/* Help Icon - hidden on mobile */}
        <Link
          to="/support"
          className="hidden sm:flex items-center justify-center p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all focus:outline-none min-w-[44px] min-h-[44px]"
          title="Support Center"
        >
          <HelpCircle className="h-5 w-5" />
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all focus:outline-none flex items-center justify-center min-w-[44px] min-h-[44px]"
        >
          {theme === 'light' ? (
            <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
          ) : (
            <Moon className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-950/30 rounded-xl transition-all focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <LogOut className="h-5 w-5" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700"></div>

        {/* Profile Info */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-xs font-bold text-gray-900 dark:text-slate-100 leading-tight">{name}</span>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{formattedRole}</span>
          </div>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={name}
              className="h-9 w-9 rounded-full object-cover border border-gray-100 shadow-sm"
            />
          ) : (
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg} border border-white/80 dark:border-slate-800 shadow-sm flex-shrink-0`}>
              {initials}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

