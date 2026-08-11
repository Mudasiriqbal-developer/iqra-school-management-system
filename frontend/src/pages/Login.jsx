import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Lock, Mail, School } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (user.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else if (user.role === 'student') {
        navigate('/student-dashboard');
      } else {
        toast.error('Unknown role assignment.');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel: Graphic & School Branding (visible on md+) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-navy-700/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-navy-800/30 rounded-full blur-3xl -ml-20 -mb-20"></div>

        {/* Top Brand Logo */}
        <div className="flex items-center space-x-3 z-10">
          <div className="h-12 w-12 flex items-center justify-center">
            <img src="/ihass-logo.png" alt="IHASS Logo" className="h-full w-full object-contain drop-shadow-md" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-wider block leading-tight">IHASS</span>
            <span className="text-[10px] text-sky-200 tracking-wider font-semibold uppercase">School Management System</span>
          </div>
        </div>

        {/* Center Graphic */}
        <div className="flex flex-col items-center justify-center flex-grow z-10 my-8">
          <div className="relative flex items-center justify-center mb-8 group">
            {/* Glowing Backdrop Ring */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 via-sky-500/20 to-indigo-500/30 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 transform scale-125"></div>
            
            {/* Main Center Circular Logo */}
            <div className="relative z-10 flex flex-col items-center justify-center transform group-hover:scale-105 transition-all duration-300">
              <img src="/ihass-logo.png" alt="IHASS Logo" className="h-44 w-44 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
          
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">Excellence in Education.</h2>
            <p className="text-navy-100 text-sm leading-relaxed">
              Optimized tools for academic success and administrative precision.
            </p>
          </div>
        </div>

        {/* School Full Name Subtitle */}
        <div className="text-navy-300 text-xs z-10 font-medium tracking-wide">
          Iqra Hadiqa Tul Atfal School System
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white">
        {/* Empty header block to align form vertically centered */}
        <div className="hidden md:block h-10"></div>

        {/* Centered Form */}
        <div className="max-w-md w-full mx-auto my-auto">
          {/* Brand Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-2 flex items-center justify-center">
              <img src="/ihass-logo.png" alt="IHASS Logo" className="h-20 w-20 object-contain drop-shadow-lg" />
            </div>
            <span className="text-2xl font-black tracking-wider text-navy-950 dark:text-slate-50">IHASS</span>
            <span className="text-xs text-gray-500 font-semibold tracking-wider uppercase mt-0.5">Iqra Hadiqa Tul Atfal School</span>
            <h1 className="text-xl font-extrabold text-navy-950 dark:text-slate-50 mt-4 tracking-tight">Portal Login</h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-1 text-center font-medium">
              Welcome back. Please sign in to access your portal.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email or Registration Number
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@ihass.edu or stud101"
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200/80 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 text-sm transition-all bg-gray-50/80 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-11 py-3 border border-gray-200/80 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 focus:border-navy-700 text-sm transition-all bg-gray-50/80 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-navy-800 border-gray-300 rounded focus:ring-navy-700 cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-slate-400 cursor-pointer select-none">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm font-semibold text-navy-800 dark:text-sky-400 hover:text-navy-700 dark:hover:text-sky-300 transition-colors">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:ring-offset-2 mt-4 flex items-center justify-center space-x-2 ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none'
                  : 'bg-navy-900 text-white hover:bg-navy-800 shadow-navy-900/20'
              }`}
            >
              {isSubmitting ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New to the institution?{' '}
            <span className="font-semibold text-navy-800">
              Contact Registration
            </span>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-8 border-t border-gray-100 flex items-center justify-center">
          <span>© 2026 IQRA School Management System. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
