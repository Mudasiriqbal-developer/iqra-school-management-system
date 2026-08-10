import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, LogOut, HelpCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ subtitle = "Administrative Suite", navItems = [], isOpen = false, onClose, onLogoutClick, schoolName, logoUrl }) => {
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      logout();
    }
  };

  return (
    <aside className={`w-64 bg-navy-primary text-white flex flex-col h-screen fixed top-0 left-0 border-r border-white/5 z-40 transition-transform duration-300 lg:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 max-w-[210px] overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-white/95 p-1 shadow-md border border-white/20 flex items-center justify-center flex-shrink-0">
              <img 
                src={logoUrl || '/ihass-logo.png'} 
                alt="IHASS Logo" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/ihass-logo.png';
                }}
              />
            </div>
            <span className="text-base font-black tracking-wider font-sans truncate text-white" title={schoolName || 'IHASS'}>
              {schoolName || 'IHASS'}
            </span>
          </div>
          <span className="text-xs text-slate-300 font-medium tracking-wide mt-2">
            {subtitle}
          </span>
        </div>
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none transition-colors"
          title="Close Menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onClose} // Auto close drawer on navigation
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-white/20 via-white/10 to-transparent text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {/* Left Accent Bar */}
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-sky-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]"></div>
              )}
              {Icon && (
                <Icon
                  className={`h-5 w-5 transition-all duration-200 group-hover:scale-110 ${
                    isActive ? 'text-sky-300' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
              )}
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Pinned Section */}
      <div className="p-4 border-t border-white/10 space-y-1">
        {/* Support Link */}
        <Link
          to="/support"
          className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-200 group"
        >
          <HelpCircle className="h-5 w-5 text-slate-400 group-hover:scale-110 transition-transform duration-200" />
          <span>Support</span>
        </Link>

        {/* Logout Link */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-200 hover:bg-red-950/40 hover:text-red-100 transition-all duration-200 text-left focus:outline-none group"
        >
          <LogOut className="h-5 w-5 text-red-300 group-hover:scale-110 transition-transform duration-200" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
