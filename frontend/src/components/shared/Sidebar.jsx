import React from 'react';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-6">
      <div className="text-lg font-bold mb-6 border-b border-gray-700 pb-3">
        Navigation
      </div>
      <ul className="space-y-3">
        <li>
          <a href="#" className="block hover:text-blue-400">Dashboard</a>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
