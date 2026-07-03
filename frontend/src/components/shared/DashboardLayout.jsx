import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ children, navItems, userName, userRole, subtitle }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar is fixed left, so we offset the main content by pl-64 */}
      <Sidebar subtitle={subtitle} navItems={navItems} />

      {/* Main Content Wrapper */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar userName={userName} userRole={userRole} />

        {/* Main page content */}
        <main className="flex-grow p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
