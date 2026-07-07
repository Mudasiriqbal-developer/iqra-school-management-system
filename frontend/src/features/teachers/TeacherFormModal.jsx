import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2, Mail } from 'lucide-react';
import { createTeacher, updateTeacher } from './teacherService';

const TeacherFormModal = ({ isOpen, onClose, teacher = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    qualification: '',
    phone: '',
    joiningDate: '',
    photoUrl: '',
    baseSalary: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset or prefill form data when teacher or open state changes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (teacher) {
        setFormData({
          name: teacher.userId?.name || '',
          email: teacher.userId?.email || '',
          employeeId: teacher.employeeId || '',
          qualification: teacher.qualification || '',
          phone: teacher.userId?.phone || '',
          joiningDate: teacher.joiningDate ? teacher.joiningDate.substring(0, 10) : '',
          photoUrl: teacher.photoUrl || '',
          baseSalary: teacher.baseSalary || 0,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          employeeId: '',
          qualification: '',
          phone: '',
          joiningDate: new Date().toISOString().substring(0, 10),
          photoUrl: '',
          baseSalary: 0,
        });
      }
    }
  }, [teacher, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
        photoUrl: formData.photoUrl.trim() || undefined,
        joiningDate: formData.joiningDate || undefined,
        baseSalary: Number(formData.baseSalary) || 0,
      };

      if (teacher) {
        // Remove read-only / security fields on update
        delete payload.email;
        
        const res = await updateTeacher(teacher._id, payload);
        if (res.success) {
          toast.success('Teacher profile updated successfully');
          onSuccess();
          onClose();
        } else {
          toast.error(res.message || 'Update failed');
        }
      } else {
        const res = await createTeacher(payload);
        if (res.success) {
          toast.success('Teacher created — an activation email has been sent');
          onSuccess();
          onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 my-8">
        
        {/* Modal Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between text-white">
          <h2 className="text-lg font-bold">
            {teacher ? 'Edit Teacher Profile' : 'Add New Teacher'}
          </h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              {!teacher && (
                <div className="text-gray-500 text-xs mt-1.5 flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>An activation email will be sent to this address so the teacher can set their own password.</span>
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

            {/* Photo URL */}
            <div className="flex flex-col">
              <label htmlFor="photoUrl" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Photo URL
              </label>
              <input
                id="photoUrl"
                type="text"
                name="photoUrl"
                value={formData.photoUrl}
                onChange={handleChange}
                placeholder="e.g. https://example.com/avatar.jpg"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm focus:border-navy-700"
              />
            </div>

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
                placeholder="e.g. PhD in Computer Science, 8+ years teaching experience"
                rows="3"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm focus:border-navy-700 resize-none"
              />
            </div>

          </div>

          {/* Modal Actions */}
          <div className="bg-slate-50 border-t border-gray-100 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-navy-900 hover:bg-navy-800 text-white font-bold py-2.5 px-5 rounded-xl flex items-center transition-colors text-sm shadow-sm focus:outline-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Teacher</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default TeacherFormModal;
