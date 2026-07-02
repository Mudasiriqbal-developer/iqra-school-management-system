import React from 'react';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="text-xl font-bold text-blue-600">Iqra School CMS</div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">User Profile</span>
      </div>
    </nav>
  );
};

export default Navbar;
