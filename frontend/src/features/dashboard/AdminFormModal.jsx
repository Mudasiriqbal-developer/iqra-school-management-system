import React, { useState } from 'react';
import { X, User, Mail, Phone, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminFormModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: 'admin',
      });

      toast.success('Admin invited successfully! An activation link has been sent.');
      setFormData({ name: '', email: '', phone: '' });
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to register admin. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-850 text-left shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 p-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Invite New Administrator</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ahmed Ali"
                  className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 dark:focus:ring-sky-500 focus:border-navy-700 dark:focus:border-sky-500 text-sm transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. admin@ihass.edu"
                  className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 dark:focus:ring-sky-500 focus:border-navy-700 dark:focus:border-sky-500 text-sm transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Phone Number <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 03001234567"
                  className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700 dark:focus:ring-sky-500 focus:border-navy-700 dark:focus:border-sky-500 text-sm transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3 justify-end p-4 px-6 border-t border-slate-100 dark:border-slate-750 bg-slate-50/80 dark:bg-slate-900/60 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-navy-900/10 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
