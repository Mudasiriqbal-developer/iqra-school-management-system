import React, { useState } from 'react';
import { X, User, Mail, Phone, Loader2, Key, Eye, EyeOff, Sparkles, Copy, Check, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { generateSecurePassword } from '../../utils/passwordGenerator';

const AdminFormModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    requireVerification: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activationLinkModal, setActivationLinkModal] = useState(null); // { activationLink, email, name }
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!formData.requireVerification) {
      if (!formData.password) {
        errs.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errs.password = 'Password must be at least 8 characters long';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        role: 'admin',
        password: formData.requireVerification ? undefined : formData.password,
        requireVerification: formData.requireVerification,
      };

      const res = await api.post('/auth/register', payload);

      if (formData.requireVerification && res.data?.data?.activationLink) {
        setActivationLinkModal({
          activationLink: res.data.data.activationLink,
          email: formData.email,
          name: formData.name,
        });
        toast.success('Admin invited! Activation link generated.');
      } else {
        toast.success('Admin created and activated successfully! Ready to log in.');
        handleClose();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to register admin. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
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

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      requireVerification: false,
    });
    setErrors({});
    setShowPassword(false);
    setActivationLinkModal(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white text-left shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-navy-950">Invite New Administrator</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* If activation link modal is shown after online invite */}
        {activationLinkModal ? (
          <div className="p-6 space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <h4 className="text-sm font-extrabold text-emerald-900">Administrator Account Created</h4>
              <p className="text-xs text-emerald-700 mt-1">
                An activation link was created for <span className="font-bold">{activationLinkModal.email}</span>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ahmed Ali"
                  className="block w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. admin@ihass.edu"
                  className="block w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all"
                />
              </div>

              {/* Password field shown in Direct Mode */}
              {!formData.requireVerification && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
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
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Key className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 8 characters"
                      className={`block w-full pl-9 pr-10 py-2.5 border rounded-xl focus:outline-hidden text-sm transition-all ${
                        errors.password ? 'border-red-400 bg-red-50/20' : 'border-gray-200 focus:border-navy-900'
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
                  {errors.password && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.password}</p>}
                  <p className="text-xxs text-gray-400 mt-1">Must be at least 8 characters. Administrator can change it after login.</p>
                </div>
              )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Phone Number <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 03001234567"
                  className="block w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-700 text-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3 justify-end p-4 px-6 border-t border-gray-100 bg-gray-50/80 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-navy-900 text-white hover:bg-navy-800 text-sm font-bold shadow-md shadow-navy-900/10 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Inviting...</span>
                </>
              ) : (
                <span>Send Invitation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminFormModal;
