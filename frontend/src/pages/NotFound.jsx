import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, SearchX } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    const token = localStorage.getItem('ihass_token');
    const userStr = localStorage.getItem('ihass_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.role) {
          if (user.role === 'admin') {
            navigate('/admin-dashboard');
            return;
          } else if (user.role === 'teacher') {
            navigate('/teacher-dashboard');
            return;
          } else if (user.role === 'student' || user.role === 'parent') {
            navigate('/student-dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 select-none">
      {/* Small IHASS logo above the content */}
      <div className="flex items-center space-x-2.5 mb-12">
        <GraduationCap className="h-6 w-6 text-navy-900" />
        <span className="text-xl font-bold tracking-wider text-navy-950">IHASS</span>
      </div>

      <div className="flex flex-col items-center text-center max-w-md">
        {/* Large icon above 404 text */}
        <div className="p-4 bg-gray-50 rounded-full mb-6 text-navy-900">
          <SearchX className="h-16 w-16" />
        </div>

        {/* Large "404" in bold navy text */}
        <h1 className="text-8xl font-black text-navy-900 tracking-tight leading-none mb-4">
          404
        </h1>

        {/* Heading */}
        <h2 className="text-2xl font-extrabold text-navy-950 mb-3">
          Page Not Found
        </h2>

        {/* Subtext */}
        <p className="text-gray-500 text-sm md:text-base leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* One button: Back to Dashboard */}
        <button
          onClick={handleBackToDashboard}
          className="w-full sm:w-auto bg-navy-900 hover:bg-navy-800 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform active:scale-95 transition-all duration-200"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
