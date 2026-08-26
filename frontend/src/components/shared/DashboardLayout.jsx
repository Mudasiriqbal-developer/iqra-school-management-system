import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { DEFAULT_NAV_ITEMS } from '../../utils/navConstants';

const DashboardLayout = ({ children, navItems, userName, userRole, subtitle }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout, user } = useAuth();
  const [schoolSettings, setSchoolSettings] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data.success) {
          setSchoolSettings(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching settings for DashboardLayout:', err);
      }
    };
    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Micro-delay for a polished, high-fidelity user experience
    setTimeout(() => {
      logout();
    }, 450);
  };

  // Compute ordered nav items if user is admin
  let displayNavItems = navItems;
  if (user && user.role === 'admin') {
    const userNavOrder = user.navOrder || [];
    if (userNavOrder.length > 0) {
      const ordered = userNavOrder
        .map(key => DEFAULT_NAV_ITEMS.find(item => item.key === key))
        .filter(Boolean);
      // Append any newly introduced keys that are not yet saved in userNavOrder
      const missing = DEFAULT_NAV_ITEMS.filter(item => !userNavOrder.includes(item.key));
      displayNavItems = [...ordered, ...missing];
    } else {
      displayNavItems = DEFAULT_NAV_ITEMS;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar 
        subtitle={subtitle} 
        navItems={displayNavItems} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogoutClick={() => setIsLogoutConfirmOpen(true)} 
        schoolName={schoolSettings?.schoolName}
        logoUrl={schoolSettings?.logoUrl}
      />

      {/* Main Content Wrapper - responsive offset */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        {/* Top Navbar */}
        <Navbar 
          userName={userName} 
          userRole={userRole} 
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onLogoutClick={() => setIsLogoutConfirmOpen(true)} 
        />

        {/* Main page content */}
        <main className="flex-grow p-4 sm:p-5 md:p-6 xl:p-8">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 transition-opacity duration-300"
            onClick={() => !isLoggingOut && setIsLogoutConfirmOpen(false)}
          />
          
          {/* Modal Card */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 relative z-10 transform transition-all duration-300 scale-100 flex flex-col items-center text-center">
            {/* Warning Icon Container */}
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4">
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
