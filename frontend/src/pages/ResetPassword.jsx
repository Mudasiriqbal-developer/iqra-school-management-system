import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Lock, Eye, EyeOff, ArrowLeft, School } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      if (response.data.success) {
        toast.success('Your password has been successfully reset.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(response.data.message || 'Failed to reset password');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'The reset link is invalid or has expired.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel (Branding) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-navy-700/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-navy-800/30 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="flex items-center space-x-3 z-10">
          <GraduationCap className="h-10 w-10 text-white" />
          <span className="text-2xl font-bold tracking-wider">IHASS</span>
        </div>

        <div className="flex flex-col items-center justify-center flex-grow z-10 my-8">
          <div className="relative w-64 h-64 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-2xl mb-8">
            <div className="absolute text-white/20 transform -translate-x-12 -translate-y-8 scale-90">
              <School className="h-28 w-28 stroke-[1]" />
            </div>
            <div className="absolute text-white/10 transform translate-x-12 translate-y-8 scale-75">
              <GraduationCap className="h-28 w-28 stroke-[1]" />
            </div>
            <div className="bg-navy-800 p-6 rounded-xl shadow-xl border border-white/10 flex items-center justify-center transform -rotate-6">
              <School className="h-16 w-16 text-white" />
            </div>
          </div>
          
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">Reset Credentials</h2>
            <p className="text-navy-100 text-sm leading-relaxed">
              Create a secure new password for your account access.
            </p>
          </div>
        </div>

        <div className="text-navy-300 text-xs z-10 font-medium">
          Iqra Hadiqa Tul Atfal School
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white">
        <div className="hidden md:block h-10"></div>

        <div className="max-w-md w-full mx-auto my-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center space-x-2.5">
              <GraduationCap className="h-10 w-10 text-navy-900" />
              <span className="text-3xl font-black tracking-wider text-navy-950">IHASS</span>
            </div>
            <h1 className="text-2xl font-extrabold text-navy-950 mt-6 tracking-tight">Reset Password</h1>
            <p className="text-gray-500 text-sm mt-1.5 text-center">
              Please enter and confirm your new account password below.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                New Password
              </label>
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
                  placeholder="Minimum 6 characters"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
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
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 text-sm font-semibold text-navy-800 hover:text-navy-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-8 pt-8 border-t border-gray-100">
          <span>© 2026 IHASS. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
