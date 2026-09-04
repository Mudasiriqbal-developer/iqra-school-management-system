import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, HelpCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ 
  subtitle = "Administrative Suite", 
  navItems = [], 
  isOpen = false, 
  isCollapsed = true,
  onToggleCollapse,
  onClose, 
  onLogoutClick, 
  schoolName, 
  logoUrl 
}) => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [activeTooltip, setActiveTooltip] = useState(null);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      logout();
    }
  };

  const homePath = navItems[0]?.path || (
    user?.role === 'teacher' 
      ? '/teacher-dashboard' 
      : user?.role === 'student' 
      ? '/student-dashboard' 
      : '/admin-dashboard'
  );

  return (
    <aside 
      className={`bg-navy-primary text-white flex flex-col h-screen fixed top-0 left-0 border-r border-white/5 z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-64 lg:w-20' : 'w-64'
      } ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div 
        className={`border-b border-white/10 flex items-center transition-all duration-300 ${
          isCollapsed 
            ? 'lg:flex-col lg:justify-center lg:py-4 px-4 py-5 justify-between' 
            : 'justify-between px-5 py-5'
        }`}
      >
        {/* Desktop Collapsed Brand Logo Button */}
        {isCollapsed ? (
          <div className="hidden lg:flex flex-col items-center justify-center w-full">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="relative group p-1.5 rounded-xl hover:bg-white/10 transition-all duration-200 focus:outline-none"
              title="Click to expand sidebar"
            >
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                <img 
                  src={logoUrl || '/ihass-logo.png'} 
                  alt="IHASS Logo" 
                  className="h-full w-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/ihass-logo.png';
                  }}
                />
              </div>
              {/* Subtle expand chevron indicator on hover */}
              <div className="absolute -bottom-1 -right-1 bg-white/20 backdrop-blur-sm rounded-full p-0.5 text-white shadow-sm opacity-0 group-hover:opacity-100 group-hover:bg-sky-500 transition-all duration-200">
                <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          </div>
        ) : null}

        {/* Brand Logo & Name (visible when expanded on desktop, or always on mobile) */}
        <div className={`flex items-center space-x-3 max-w-[190px] overflow-hidden ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
          <Link
            to={homePath}
            onClick={onClose}
            className="flex items-center space-x-3 group min-w-0"
            title={schoolName || 'IHASS'}
          >
            <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
              <img 
                src={logoUrl || '/ihass-logo.png'} 
                alt="IHASS Logo" 
                className="h-full w-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/ihass-logo.png';
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-black tracking-wider font-sans truncate text-white">
                {schoolName || 'IHASS'}
              </span>
              <span className="text-[11px] text-slate-300 font-medium tracking-wide truncate">
                {subtitle}
              </span>
            </div>
          </Link>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-1">
          {/* Desktop Collapse Toggle Button (visible when expanded) */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none transition-colors"
              title="Collapse to mini-sidebar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none transition-colors"
            title="Close Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Nav Items */}
      <nav 
        onScroll={() => setActiveTooltip(null)}
        className={`flex-1 ${
          isCollapsed ? 'px-2' : 'px-4'
        } py-4 overflow-y-auto space-y-1.5 sidebar-scrollbar`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <div key={item.label} className="relative group">
              <Link
                to={item.path}
                onClick={onClose}
                onMouseEnter={(e) => {
                  if (isCollapsed) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveTooltip({
                      label: item.label,
                      top: rect.top + rect.height / 2
                    });
                  }
                }}
                onMouseLeave={() => setActiveTooltip(null)}
                className={`flex items-center ${
                  isCollapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'
                } py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-white/20 via-white/10 to-transparent text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {/* Left Accent Bar */}
                {isActive && (
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-sky-400 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.8)]"></div>
                )}
                {Icon && (
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${
                      isActive ? 'text-sky-300' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                )}
                <span 
                  className={`tracking-tight whitespace-nowrap ml-3 transition-opacity duration-200 ${
                    isCollapsed ? 'lg:hidden' : 'inline-block'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom Pinned Section */}
      <div 
        className={`p-3 sm:p-4 border-t border-white/10 space-y-1 ${
          isCollapsed ? 'lg:px-2' : ''
        }`}
      >
        {/* Support Link */}
        <div className="relative group">
          <Link
            to="/support"
            onClick={onClose}
            onMouseEnter={(e) => {
              if (isCollapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({
                  label: 'Support',
                  top: rect.top + rect.height / 2
                });
              }
            }}
            onMouseLeave={() => setActiveTooltip(null)}
            className={`flex items-center ${
              isCollapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'
            } py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-200`}
          >
            <HelpCircle className="h-5 w-5 text-slate-400 group-hover:scale-110 group-hover:text-white transition-transform duration-200 flex-shrink-0" />
            <span 
              className={`ml-3 whitespace-nowrap transition-opacity duration-200 ${
                isCollapsed ? 'lg:hidden' : 'inline-block'
              }`}
            >
              Support
            </span>
          </Link>
        </div>

        {/* Logout Link */}
        <div className="relative group">
          <button
            type="button"
            onClick={handleLogout}
            onMouseEnter={(e) => {
              if (isCollapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({
                  label: 'Logout',
                  top: rect.top + rect.height / 2,
                  isDanger: true
                });
              }
            }}
            onMouseLeave={() => setActiveTooltip(null)}
            className={`w-full flex items-center ${
              isCollapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'
            } py-2.5 rounded-xl text-sm font-semibold text-red-200 hover:bg-red-950/40 hover:text-red-100 transition-all duration-200 text-left focus:outline-none`}
          >
            <LogOut className="h-5 w-5 text-red-300 group-hover:scale-110 group-hover:text-red-200 transition-transform duration-200 flex-shrink-0" />
            <span 
              className={`ml-3 whitespace-nowrap transition-opacity duration-200 ${
                isCollapsed ? 'lg:hidden' : 'inline-block'
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Floating Tooltip outside scroll container */}
      {isCollapsed && activeTooltip && (
        <div 
          style={{ top: `${activeTooltip.top}px` }}
          className={`hidden lg:flex fixed left-20 -translate-y-1/2 ml-3 px-3 py-1.5 ${
            activeTooltip.isDanger 
              ? 'bg-navy-950/95 text-red-300 border-red-500/30' 
              : 'bg-navy-950/95 text-white border-white/10'
          } text-xs font-semibold rounded-lg shadow-2xl border pointer-events-none whitespace-nowrap z-50 items-center animate-modal-zoom`}
        >
          <span>{activeTooltip.label}</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
