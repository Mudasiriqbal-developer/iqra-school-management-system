import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, HelpCircle, LogOut, Menu, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ userName = "Admin User", userRole = "Administrator", userAvatar = "", onToggleSidebar, onLogoutClick }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      logout();
    }
  };

  // Prefer AuthContext data, fallback to props
  const name = user?.name || userName;
  const role = user?.role || userRole;

  // Format roles for nice display
  const formattedRole = role === 'admin'
    ? 'Administrator'
    : role === 'teacher'
    ? 'Faculty Member'
    : role === 'student'
    ? 'Student'
    : role === 'parent'
    ? 'Parent'
    : role;

  // Generate color palette index based on length
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

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System Default', icon: Monitor }
  ];

  const ActiveThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className="bg-white border-b border-gray-200 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 right-0 z-10 w-full">
      {/* Left: Menu toggle & Search */}
      <div className="flex items-center space-x-3 flex-1 min-w-0 mr-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none flex-shrink-0"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="w-full max-w-[150px] xs:max-w-[200px] sm:max-w-xs">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 text-xs bg-gray-50 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Right Tools and Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        {/* Help Icon - hidden on mobile */}
        <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none">
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notification Bell */}
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative focus:outline-none">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 border border-white"></span>
        </button>

        {/* Theme Selector */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setIsThemeMenuOpen(prev => !prev)}
            title="Toggle Theme"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors focus:outline-none flex items-center justify-center"
          >
            <ActiveThemeIcon className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-50 dark:bg-slate-800 dark:border-slate-700">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold transition-colors duration-150 text-left ${
                      isSelected
                        ? 'bg-navy-50 text-[#00215E] dark:bg-sky-950/40 dark:text-sky-400'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-[#00215E] dark:text-sky-400' : 'text-gray-400'}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
        >
          <LogOut className="h-5 w-5" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200"></div>

        {/* Profile Info */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-xs font-bold text-gray-900 leading-tight">{name}</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{formattedRole}</span>
          </div>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={name}
              className="h-9 w-9 rounded-full object-cover border border-gray-100"
            />
          ) : (
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg} border border-white shadow-sm flex-shrink-0`}>
              {initials}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
