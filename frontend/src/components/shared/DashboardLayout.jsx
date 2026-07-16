import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Loader2 } from 'lucide-react';

const DashboardLayout = ({ children, navItems, userName, userRole, subtitle }) => {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Micro-delay for a polished, high-fidelity user experience
    setTimeout(() => {
      logout();
    }, 450);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar is fixed left, so we offset the main content by pl-64 */}
      <Sidebar 
        subtitle={subtitle} 
        navItems={navItems} 
        onLogoutClick={() => setIsLogoutConfirmOpen(true)} 
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar 
          userName={userName} 
          userRole={userRole} 
          onLogoutClick={() => setIsLogoutConfirmOpen(true)} 
        />

        {/* Main page content */}
        <main className="flex-grow p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => !isLoggingOut && setIsLogoutConfirmOpen(false)}
          />
          
          {/* Modal Card */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 relative z-10 transform transition-all duration-300 scale-100 flex flex-col items-center text-center">
            {/* Warning Icon Container */}
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4 animate-pulse">
              <LogOut className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-navy-950">Confirm Logout</h3>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to log out? You will need to sign in again to access the portal.
            </p>

            {/* Actions Row */}
            <div className="flex items-center space-x-3 w-full mt-6">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-all shadow-md text-xs flex items-center justify-center space-x-2 disabled:bg-red-400"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <span>Log Out</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
