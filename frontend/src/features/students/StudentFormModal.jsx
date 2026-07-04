import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';
import {
  createStudent,
  updateStudent,
  getClasses,
  getSectionsByClass
} from './studentService';

const StudentFormModal = ({ isOpen, onClose, student = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    registrationNumber: '',
    fullName: '',
    fatherName: '',
    gender: '',
    dateOfBirth: '',
    fatherContact: '',
    email: '',
    classId: '',
    sectionId: '',
    address: '',
    status: 'active'
  });

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset or prefill form data when student or open state changes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (student) {
        setFormData({
          registrationNumber: student.registrationNumber || '',
          fullName: student.fullName || '',
          fatherName: student.fatherName || '',
          gender: student.gender || '',
          dateOfBirth: student.dateOfBirth ? student.dateOfBirth.substring(0, 10) : '',
          fatherContact: student.fatherContact || '',
          email: student.email || '',
          classId: student.classId?._id || student.classId || '',
          sectionId: student.sectionId?._id || student.sectionId || '',
          address: student.address || '',
          status: student.status || 'active'
        });
      } else {
        setFormData({
          registrationNumber: '',
          fullName: '',
          fatherName: '',
          gender: '',
          dateOfBirth: '',
          fatherContact: '',
          email: '',
          classId: '',
          sectionId: '',
          address: '',
          status: 'active'
        });
      }
    }
  }, [student, isOpen]);

  // Load all classes
  useEffect(() => {
    if (isOpen) {
      const fetchClasses = async () => {
        try {
          setLoadingClasses(true);
          const res = await getClasses();
          if (res.success) {
            setClasses(res.data);
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load classes');
        } finally {
          setLoadingClasses(false);
        }
      };
      fetchClasses();
    }
  }, [isOpen]);

  // Load sections when classId changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!formData.classId) {
        setSections([]);
        return;
      }
      try {
        setLoadingSections(true);
        const res = await getSectionsByClass(formData.classId);
        if (res.success) {
          setSections(res.data);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load sections for this class');
      } finally {
        setLoadingSections(false);
      }
    };
    fetchSections();
  }, [formData.classId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset section if class changes
      ...(name === 'classId' ? { sectionId: '' } : {})
    }));
    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Perform basic validations
  const validateForm = () => {
    const newErrors = {};

    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required';
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.fatherName.trim()) {
      newErrors.fatherName = "Father's name is required";
    }
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!formData.fatherContact.trim()) {
      newErrors.fatherContact = "Father's contact number is required";
    } else if (!/^\d+$/.test(formData.fatherContact.trim())) {
      newErrors.fatherContact = 'Contact number must contain digits only';
    }
    if (!formData.classId) {
      newErrors.classId = 'Class is required';
    }
    if (!formData.sectionId) {
      newErrors.sectionId = 'Section is required';
    }
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Invalid email format';
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
      
      // Clean email payload if empty
      const payload = {
        ...formData,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined
      };

      let res;
      if (student) {
        res = await updateStudent(student._id, payload);
      } else {
        res = await createStudent(payload);
      }

      if (res.success) {
        toast.success(student ? 'Student updated successfully' : 'Student created successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Something went wrong');
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
            {student ? 'Edit Student Record' : 'Add New Student'}
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
            
            {/* Registration Number */}
            <div className="flex flex-col">
              <label htmlFor="registrationNumber" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                id="registrationNumber"
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="e.g. REG-1002"
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                  errors.registrationNumber ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              />
              {errors.registrationNumber && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.registrationNumber}</span>
              )}
            </div>

            {/* Full Name */}
            <div className="flex flex-col">
              <label htmlFor="fullName" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Ayesha Rahman"
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                  errors.fullName ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              />
              {errors.fullName && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.fullName}</span>
              )}
            </div>

            {/* Father's Name */}
            <div className="flex flex-col">
              <label htmlFor="fatherName" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Father's Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fatherName"
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                placeholder="e.g. Tariq Rahman"
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                  errors.fatherName ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              />
              {errors.fatherName && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.fatherName}</span>
              )}
            </div>

            {/* Gender */}
            <div className="flex flex-col">
              <label htmlFor="gender" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm bg-white ${
                  errors.gender ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.gender}</span>
              )}
            </div>

            {/* Date of Birth */}
            <div className="flex flex-col">
              <label htmlFor="dateOfBirth" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                  errors.dateOfBirth ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              />
              {errors.dateOfBirth && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.dateOfBirth}</span>
              )}
            </div>

            {/* Father's Contact */}
            <div className="flex flex-col">
              <label htmlFor="fatherContact" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Father's Contact <span className="text-red-500">*</span>
              </label>
              <input
                id="fatherContact"
                type="tel"
                name="fatherContact"
                value={formData.fatherContact}
                onChange={handleChange}
                placeholder="e.g. 03001234567"
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                  errors.fatherContact ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              />
              {errors.fatherContact && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.fatherContact}</span>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <label htmlFor="email" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Email Address <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. student@gmail.com"
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                  errors.email ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              />
              {errors.email && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.email}</span>
              )}
            </div>

            {/* Class */}
            <div className="flex flex-col">
              <label htmlFor="classId" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                id="classId"
                name="classId"
                value={formData.classId}
                onChange={handleChange}
                disabled={loadingClasses}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm bg-white ${
                  errors.classId ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              >
                <option value="">{loadingClasses ? 'Loading classes...' : 'Select Class'}</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.classId}</span>
              )}
            </div>

            {/* Section */}
            <div className="flex flex-col">
              <label htmlFor="sectionId" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Section <span className="text-red-500">*</span>
              </label>
              <select
                id="sectionId"
                name="sectionId"
                value={formData.sectionId}
                onChange={handleChange}
                disabled={!formData.classId || loadingSections}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 ${
                  errors.sectionId ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              >
                <option value="">
                  {!formData.classId 
                    ? 'Select class first' 
                    : loadingSections 
                    ? 'Loading sections...' 
                    : 'Select Section'}
                </option>
                {sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.sectionId && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.sectionId}</span>
              )}
            </div>

            {/* Status (Only in EDIT mode) */}
            {student && (
              <div className="flex flex-col">
                <label htmlFor="status" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                  Student Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm bg-white focus:border-navy-700"
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}

            {/* Address (Span full width) */}
            <div className="flex flex-col md:col-span-2">
              <label htmlFor="address" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Residential Address <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. Street Address, City, Country"
                rows="2"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm focus:border-navy-700 resize-none"
              ></textarea>
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-colors focus:outline-none disabled:bg-navy-900/70"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{submitting ? 'Saving...' : 'Save Record'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default StudentFormModal;
