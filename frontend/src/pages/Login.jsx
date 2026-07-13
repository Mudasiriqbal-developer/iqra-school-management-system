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
      } else if (user.role === 'student' || user.role === 'parent') {
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
          <GraduationCap className="h-10 w-10 text-white" />
          <span className="text-2xl font-bold tracking-wider">IHASS</span>
        </div>

        {/* Center Graphic */}
        <div className="flex flex-col items-center justify-center flex-grow z-10 my-8">
          <div className="relative w-64 h-64 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-2xl mb-8">
            <div className="absolute text-white/20 transform -translate-x-12 -translate-y-8 scale-90">
              <School className="h-28 w-28 stroke-[1]" />
            </div>
            <div className="absolute text-white/10 transform translate-x-12 translate-y-8 scale-75">
              <GraduationCap className="h-28 w-28 stroke-[1]" />
            </div>
            <div className="bg-navy-800 p-6 rounded-xl shadow-xl border border-white/10 flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform duration-300">
              <School className="h-16 w-16 text-white" />
            </div>
            <div className="absolute bg-navy-750 p-4 rounded-xl shadow-lg border border-white/10 flex items-center justify-center transform translate-x-12 -translate-y-12 rotate-12 hover:rotate-0 transition-transform duration-300">
              <GraduationCap className="h-12 w-12 text-white" />
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
        <div className="text-navy-300 text-xs z-10 font-medium">
          Iqra Hadiqa Tul Atfal School
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
            <div className="flex items-center space-x-2.5">
              <GraduationCap className="h-10 w-10 text-navy-900" />
              <span className="text-3xl font-black tracking-wider text-navy-950">IHASS</span>
            </div>
            <h1 className="text-2xl font-extrabold text-navy-950 mt-6 tracking-tight">Portal Login</h1>
            <p className="text-gray-500 text-sm mt-1.5 text-center">
              Welcome back. Please sign in to access your portal.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Email or Registration Number
              </label>
              <div className="relative rounded-xl shadow-sm">
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
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-sm">
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
                  className="block w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
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
                  className="h-4 w-4 text-navy-800 border-gray-300 rounded focus:ring-navy-700"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm font-semibold text-navy-800 hover:text-navy-700 transition-colors">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-xl font-bold transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-navy-700 focus:ring-offset-2 mt-4 flex items-center justify-center space-x-2 ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none'
                  : 'bg-navy-900 text-white hover:bg-navy-800 shadow-navy-900/10'
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
        <div className="text-center text-xs text-gray-400 mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <span>© 2026 IHASS. All rights reserved.</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
