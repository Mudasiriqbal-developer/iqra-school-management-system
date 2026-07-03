import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';

const Sidebar = ({ subtitle = "Administrative Suite", navItems = [] }) => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-navy-900 text-white flex flex-col h-screen fixed top-0 left-0 border-r border-navy-950/20 z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-navy-950/30 flex flex-col">
        <div className="flex items-center space-x-2.5">
          <GraduationCap className="h-8 w-8 text-white" />
          <span className="text-xl font-bold tracking-wider">IHASS</span>
        </div>
        <span className="text-xs text-navy-300 font-semibold uppercase tracking-wider mt-1.5">
          {subtitle}
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-navy-800 text-white shadow-inner'
                  : 'text-navy-200 hover:bg-navy-800/50 hover:text-white'
              }`}
            >
              {/* Left Accent Bar */}
              {isActive && (
                <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-white rounded-r"></div>
              )}
              {Icon && (
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-navy-300 group-hover:text-white'
                  }`}
                />
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Pinned Logout */}
      <div className="p-4 border-t border-navy-950/30">
        <Link
          to="/login"
          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-200 hover:bg-red-950/20 hover:text-red-100 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5 text-red-300" />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
