import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2, Mail, Key, Eye, EyeOff, Sparkles, Copy, Check, Wifi, WifiOff } from 'lucide-react';
import { createTeacher, updateTeacher } from './teacherService';
import { generateSecurePassword } from '../../utils/passwordGenerator';

const TeacherFormModal = ({ isOpen, onClose, teacher = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    qualification: '',
    phone: '',
    joiningDate: '',
    baseSalary: 0,
    password: '',
    requireVerification: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activationLinkModal, setActivationLinkModal] = useState(null); // { activationLink, name, email }
  const [copied, setCopied] = useState(false);

  // Reset or prefill form data when teacher or open state changes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setShowPassword(false);
      setActivationLinkModal(null);
      setCopied(false);
      if (teacher) {
        setFormData({
          name: teacher.userId?.name || '',
          email: teacher.userId?.email || '',
          employeeId: teacher.employeeId || '',
          qualification: teacher.qualification || '',
          phone: teacher.userId?.phone || '',
          joiningDate: teacher.joiningDate ? teacher.joiningDate.substring(0, 10) : '',
          baseSalary: teacher.baseSalary || 0,
          password: '',
          requireVerification: false,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          employeeId: '',
          qualification: '',
          phone: '',
          joiningDate: new Date().toISOString().substring(0, 10),
          baseSalary: 0,
          password: '',
          requireVerification: false,
        });
      }
    }
  }, [teacher, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleGeneratePassword = () => {
    const randomPwd = generateSecurePassword();
    setFormData((prev) => ({ ...prev, password: randomPwd }));
    setShowPassword(true);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
    toast.success('Generated secure password');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!teacher) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email address is required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          newErrors.email = 'Invalid email format';
        }
      }

      if (!formData.requireVerification) {
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters long';
        }
      }
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    }

    if (formData.phone.trim()) {
      if (!/^\+?[\d\s-]{7,15}$/.test(formData.phone.trim())) {
        newErrors.phone = 'Invalid phone number format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      const payload = {
        ...formData,
        email: formData.email.trim(),
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim(),
        qualification: formData.qualification.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        joiningDate: formData.joiningDate || undefined,
        baseSalary: Number(formData.baseSalary) || 0,
      };

      if (teacher) {
        // Remove read-only / security fields on update
        delete payload.email;
        delete payload.password;
        delete payload.requireVerification;
        
        const res = await updateTeacher(teacher._id, payload);
        if (res.success) {
          toast.success('Teacher profile updated successfully');
          onSuccess();
          onClose();
        } else {
          toast.error(res.message || 'Update failed');
        }
      } else {
        payload.password = formData.requireVerification ? undefined : formData.password;
        payload.requireVerification = formData.requireVerification;

        const res = await createTeacher(payload);
        if (res.success) {
          if (formData.requireVerification && res.data?.activationLink) {
            setActivationLinkModal({
              activationLink: res.data.activationLink,
              name: formData.name,
              email: formData.email,
            });
            toast.success('Teacher invited! Activation link generated.');
            onSuccess();
          } else {
            toast.success('Teacher created and activated successfully');
            onSuccess();
            onClose();
          }
        } else {
          toast.error(res.message || 'Creation failed');
        }
      }
    } catch (err) {
      console.error(err);
      const serverMessage = err.response?.data?.message || 'Server error occurred';
      toast.error(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (activationLinkModal?.activationLink) {
      navigator.clipboard.writeText(activationLinkModal.activationLink);
      setCopied(true);
      toast.success('Activation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Modal Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">
              {teacher ? 'Edit Teacher Profile' : 'Add New Teacher'}
            </h2>
            {!teacher && (
              <p className="text-xs text-sky-200">Dual-Mode: Direct Password (Offline) or Email Invite (Online)</p>
            )}
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* If activation link modal is shown after online invite */}
        {activationLinkModal ? (
          <div className="p-6 space-y-5">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 text-center">
              <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">Teacher Account Created</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                An activation link was created for <span className="font-bold">{activationLinkModal.email}</span>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Activation Link (For Direct Sharing)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={activationLinkModal.activationLink}
                  className="block w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl font-mono text-gray-700 dark:text-slate-200 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors flex-shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xxs text-gray-400 dark:text-slate-400 mt-1.5 font-medium">
                The teacher can open this link in any browser to activate their account and set their password.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-6 rounded-xl bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Main Form */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Provisioning Mode Toggle for new teachers */}
              {!teacher && (
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700 p-4 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Account Provisioning Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-200/70 dark:bg-slate-950 p-1 rounded-xl border border-transparent dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, requireVerification: false }))}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        !formData.requireVerification
                          ? 'bg-white text-navy-950 dark:bg-slate-800 dark:text-white shadow-xs border border-transparent dark:border-slate-700'
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <WifiOff className={`h-3.5 w-3.5 ${!formData.requireVerification ? 'text-navy-800 dark:text-sky-400' : 'text-gray-400 dark:text-slate-400'}`} />
                      <span>Direct Password (Offline)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, requireVerification: true }))}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        formData.requireVerification
                          ? 'bg-white text-navy-950 dark:bg-slate-800 dark:text-white shadow-xs border border-transparent dark:border-slate-700'
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Wifi className={`h-3.5 w-3.5 ${formData.requireVerification ? 'text-navy-800 dark:text-sky-400' : 'text-gray-400 dark:text-slate-400'}`} />
                      <span>Email Invitation (Online)</span>
                    </button>
                  </div>
                  <p className="text-xxs text-gray-500 dark:text-slate-400 font-medium">
                    {!formData.requireVerification
                      ? 'Default: Account is activated immediately with password. Works offline with zero internet needed.'
                      : 'Online: Sends an activation link to the teacher email so they can set their password.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full Name */}
                <div className="flex flex-col">
                  <label htmlFor="name" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Mudasir Iqbal"
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                      errors.name ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                    }`}
                  />
                  {errors.name && (
                    <span className="text-red-500 text-xs font-medium mt-1">{errors.name}</span>
                  )}
                </div>

                {/* Employee ID */}
                <div className="flex flex-col">
                  <label htmlFor="employeeId" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="employeeId"
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="e.g. EMP-103"
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                      errors.employeeId ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                    }`}
                  />
                  {errors.employeeId && (
                    <span className="text-red-500 text-xs font-medium mt-1">{errors.employeeId}</span>
                  )}
                </div>

                {/* Email Address */}
                <div className="flex flex-col">
                  <label htmlFor="email" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!!teacher}
                    placeholder="e.g. mudasir@ihass.edu"
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                      errors.email ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                    } disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  />
                  {errors.email && (
                    <span className="text-red-500 text-xs font-medium mt-1">{errors.email}</span>
                  )}
                  {!teacher && formData.requireVerification && (
                    <div className="text-gray-500 text-xs mt-1.5 flex items-center gap-1.5 font-medium">
                      <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>An activation email will be sent to this address.</span>
                    </div>
                  )}
                </div>

                {/* Contact Phone */}
                <div className="flex flex-col">
                  <label htmlFor="phone" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    id="phone"
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +923001234567"
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                      errors.phone ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                    }`}
                  />
                  {errors.phone && (
                    <span className="text-red-500 text-xs font-medium mt-1">{errors.phone}</span>
                  )}
                </div>

                {/* Password field in Direct Mode (Offline) */}
                {!teacher && !formData.requireVerification && (
                  <div className="flex flex-col md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="text-xs font-bold text-navy-950 uppercase">
                        Initial Password <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-navy-900 hover:text-navy-800 text-xs font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span>Generate Password</span>
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Key className="h-4 w-4" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Minimum 8 characters"
                        className={`w-full pl-9 pr-10 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                          errors.password ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="text-red-500 text-xs font-medium mt-1">{errors.password}</span>
                    )}
                    <p className="text-xxs text-gray-400 mt-1">Minimum 8 characters. The teacher can use this password to log in immediately.</p>
                  </div>
                )}

                {/* Joining Date */}
                <div className="flex flex-col">
                  <label htmlFor="joiningDate" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                    Joining Date
                  </label>
                  <input
                    id="joiningDate"
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm focus:border-navy-700"
                  />
                </div>

                {/* Base Salary */}
                <div className="flex flex-col">
                  <label htmlFor="baseSalary" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                    Base Salary (Rs.)
                  </label>
                  <input
                    id="baseSalary"
                    type="number"
                    name="baseSalary"
                    value={formData.baseSalary}
                    onChange={handleChange}
                    placeholder="e.g. 45000"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm focus:border-navy-700 font-bold"
                  />
                </div>

                {/* Qualification */}
                <div className="flex flex-col md:col-span-2">
                  <label htmlFor="qualification" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                    Qualification
                  </label>
                  <textarea
                    id="qualification"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="e.g. MSc in Education, 5+ years teaching experience"
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm focus:border-navy-700 resize-none"
                  />
                </div>

              </div>
            </div>

            {/* Modal Actions (Pinned at bottom) */}
            <div className="bg-slate-50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-700 px-6 py-4 flex justify-end space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-navy-900 dark:bg-blue-600 hover:bg-navy-800 dark:hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl flex items-center transition-colors text-sm shadow-sm focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>
                    {teacher
                      ? 'Update Profile'
                      : !formData.requireVerification
                      ? 'Create & Activate Teacher'
                      : 'Send Invitation'}
                  </span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default TeacherFormModal;
