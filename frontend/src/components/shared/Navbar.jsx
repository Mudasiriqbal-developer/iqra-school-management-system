import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';

const Navbar = ({ userName = "Admin User", userRole = "Administrator", userAvatar = "" }) => {
  // Generate color palette index based on length
  const colors = [
    'bg-blue-600 text-blue-100',
    'bg-purple-600 text-purple-100',
    'bg-emerald-600 text-emerald-100',
    'bg-amber-600 text-amber-100',
    'bg-pink-600 text-pink-100',
    'bg-indigo-600 text-indigo-100'
  ];
  const colorIndex = userName.length % colors.length;
  const avatarBg = colors[colorIndex];
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 right-0 z-10 w-full">
      {/* Left: Global Search */}
      <div className="w-96 max-w-xs sm:max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search anything..."
            className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 text-xs bg-gray-50 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right Tools and Profile */}
      <div className="flex items-center space-x-4">
        {/* Help Icon */}
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none">
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notification Bell */}
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative focus:outline-none">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-danger border border-white"></span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200"></div>

        {/* Profile Info */}
        <div className="flex items-center space-x-3">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-xs font-bold text-gray-900 leading-tight">{userName}</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{userRole}</span>
          </div>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="h-9 w-9 rounded-full object-cover border border-gray-100"
            />
          ) : (
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg} border border-white shadow-sm`}>
              {initials}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
