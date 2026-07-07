import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Lock, Mail, School, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateActivationToken, activateAccount } from '../features/auth/activationService';
import toast from 'react-hot-toast';

const ActivateAccount = () => {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [validationState, setValidationState] = useState('validating'); // 'validating' | 'invalid' | 'valid'
  const [accountInfo, setAccountInfo] = useState(null); // { name, email }
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await validateActivationToken(urlToken);
        if (res.success && res.data) {
          setAccountInfo(res.data);
          setValidationState('valid');
        } else {
          setValidationState('invalid');
        }
      } catch (err) {
        console.error(err);
        setValidationState('invalid');
      }
    };
    if (urlToken) {
      validateToken();
    } else {
      setValidationState('invalid');
    }
  }, [urlToken]);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score++;
    // Variety check
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    
    const varietyCount = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (varietyCount >= 1) score++;
    if (pwd.length >= 10 && varietyCount >= 2) score++;

    return Math.min(3, Math.max(1, score));
  };

  const strength = getPasswordStrength(password);

  const getStrengthLabel = (str) => {
    if (str === 1) return 'Weak';
    if (str === 2) return 'Medium';
    if (str === 3) return 'Strong';
    return '';
  };

  const getSegmentColor = (index, str) => {
    if (index > str) return 'bg-gray-200';
    if (str === 1) return 'bg-red-500';
    if (str === 2) return 'bg-amber-500';
    if (str === 3) return 'bg-emerald-500';
    return 'bg-gray-200';
  };

  const validateForm = () => {
    const newErrors = {};
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const res = await activateAccount(urlToken, password);
      if (res.success && res.data) {
        toast.success(`Welcome to IHASS, ${accountInfo?.name || 'User'}! Account activated.`);
        const { user, token } = res.data;
        setSession(user, token);
        navigate('/teacher-dashboard');
      } else {
        toast.error(res.message || 'Activation failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Activation link is expired or invalid.');
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
            {validationState === 'valid' && accountInfo ? (
              <>
                <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                  Welcome to IHASS, {accountInfo.name}.
                </h2>
                <p className="text-navy-100 text-sm leading-relaxed">
                  You're almost set up. Create a password to activate your account.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-extrabold tracking-tight mb-3">
                  Excellence in Education.
                </h2>
                <p className="text-navy-100 text-sm leading-relaxed">
                  Optimized tools for academic success and administrative precision.
                </p>
              </>
            )}
          </div>
        </div>

        {/* School Full Name Subtitle */}
        <div className="text-navy-300 text-xs z-10 font-medium">
          Iqra Hadiqa Tul Atfal School
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white">
        <div className="hidden md:block h-10"></div>

        <div className="max-w-md w-full mx-auto my-auto">
          {validationState === 'validating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin h-10 w-10 text-navy-900 mb-4" />
              <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">
                Verifying activation link...
              </p>
            </div>
          )}

          {validationState === 'invalid' && (
            <div className="flex flex-col items-center text-center py-12">
              <div className="bg-red-50 p-4 rounded-full border border-red-100 mb-6 flex items-center justify-center">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">
                This invitation link has expired
              </h1>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed max-w-sm">
                Please contact your school admin to request a new invitation link.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-8 px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-navy-900/10"
              >
                Go to Login Portal
              </button>
            </div>
          )}

          {validationState === 'valid' && accountInfo && (
            <div>
              {/* Brand Header */}
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center space-x-2.5">
                  <GraduationCap className="h-10 w-10 text-navy-900" />
                  <span className="text-3xl font-black tracking-wider text-navy-950">IHASS</span>
                </div>
                <h1 className="text-2xl font-extrabold text-navy-950 mt-6 tracking-tight">
                  Activate Your Account
                </h1>
                <p className="text-gray-500 text-xs mt-2 text-center bg-gray-50 border border-gray-100 py-1.5 px-3 rounded-lg font-medium">
                  Setting up account: <span className="font-bold text-navy-900">{accountInfo.email}</span>
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email (Disabled Visual Indicator) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      disabled
                      value={accountInfo.email}
                      className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm transition-all bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Create Password
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
                      placeholder="••••••••"
                      className={`block w-full pl-11 pr-11 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all bg-gray-50 focus:bg-white ${
                        errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-red-500 text-xs font-medium mt-1 block">{errors.password}</span>
                  )}

                  {/* Password Strength Meter */}
                  <div className="mt-2">
                    <div className="flex space-x-1.5">
                      {[1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${getSegmentColor(index, strength)}`}
                        />
                      ))}
                    </div>
                    {password && (
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">
                        Strength:{' '}
                        <span
                          className={
                            strength === 1
                              ? 'text-red-500'
                              : strength === 2
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }
                        >
                          {getStrengthLabel(strength)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Confirm Password Field */}
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
                      className={`block w-full pl-11 pr-11 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all bg-gray-50 focus:bg-white ${
                        errors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="text-red-500 text-xs font-medium mt-1 block">{errors.confirmPassword}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-xl font-bold transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-navy-700 focus:ring-offset-2 mt-6 flex items-center justify-center space-x-2 ${
                    isSubmitting
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none'
                      : 'bg-navy-900 text-white hover:bg-navy-800 shadow-navy-900/10'
                  }`}
                >
                  {isSubmitting ? 'Activating...' : 'Activate Account'}
                </button>
              </form>
            </div>
          )}
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

export default ActivateAccount;
