import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
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
    classId: '',
    sectionId: '',
    address: '',
    monthlyFeeAmount: 0,
    status: 'active'
  });

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // States for optional admission details (Create mode only)
  const [isAdmissionExpanded, setIsAdmissionExpanded] = useState(false);
  const [admissionFee, setAdmissionFee] = useState('');
  const [books, setBooks] = useState([]);
  const [admissionErrors, setAdmissionErrors] = useState({});
  const [admissionPaymentStatus, setAdmissionPaymentStatus] = useState('');
  const [admissionAmountPaid, setAdmissionAmountPaid] = useState('');

  // Reset or prefill form data when student or open state changes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setAdmissionErrors({});
      setIsAdmissionExpanded(false);
      setAdmissionFee('');
      setBooks([]);
      setAdmissionPaymentStatus('');
      setAdmissionAmountPaid('');
      if (student) {
        setFormData({
          registrationNumber: student.registrationNumber || '',
          fullName: student.fullName || '',
          fatherName: student.fatherName || '',
          gender: student.gender || '',
          dateOfBirth: student.dateOfBirth ? student.dateOfBirth.substring(0, 10) : '',
          fatherContact: student.fatherContact || '',
          classId: student.classId?._id || student.classId || '',
          sectionId: student.sectionId?._id || student.sectionId || '',
          address: student.address || '',
          monthlyFeeAmount: student.monthlyFeeAmount || 0,
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
          classId: '',
          sectionId: '',
          address: '',
          monthlyFeeAmount: 0,
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

  const handleAddBook = () => {
    setBooks(prev => [...prev, { title: '', price: '' }]);
  };

  const handleRemoveBook = (index) => {
    setBooks(prev => prev.filter((_, idx) => idx !== index));
    setAdmissionErrors(prev => {
      const next = { ...prev };
      delete next[`book_title_${index}`];
      delete next[`book_price_${index}`];
      const shifted = {};
      Object.keys(next).forEach(key => {
        if (key.startsWith('book_title_') || key.startsWith('book_price_')) {
          const parts = key.split('_');
          const field = parts[1];
          const idx = parseInt(parts[parts.length - 1], 10);
          if (idx > index) {
            shifted[`book_${field}_${idx - 1}`] = next[key];
          } else {
            shifted[key] = next[key];
          }
        } else {
          shifted[key] = next[key];
        }
      });
      return shifted;
    });
  };

  const handleBookChange = (index, field, value) => {
    setBooks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setAdmissionErrors(prev => ({
      ...prev,
      [`book_${field}_${index}`]: ''
    }));
  };

  const getBooksSubtotal = () => {
    let subtotal = 0;
    let hasCompletedRow = false;
    books.forEach(book => {
      const hasTitle = book.title && book.title.trim() !== '';
      const hasPrice = book.price !== '' && book.price !== undefined && book.price !== null;
      if (hasTitle && hasPrice) {
        const priceVal = parseFloat(book.price);
        if (!isNaN(priceVal)) {
          subtotal += priceVal;
          hasCompletedRow = true;
        }
      }
    });
    return { subtotal, hasCompletedRow };
  };

  const validateAdmission = () => {
    const newErrors = {};
    let isValid = true;

    // Validate Admission Fee
    if (admissionFee !== '' && admissionFee !== undefined && admissionFee !== null) {
      const feeVal = parseFloat(admissionFee);
      if (isNaN(feeVal) || feeVal < 0) {
        newErrors.fee = 'Admission fee must be a non-negative number';
        isValid = false;
      }
    }

    // Validate Books
    books.forEach((book, index) => {
      const hasTitle = book.title && book.title.trim() !== '';
      const hasPrice = book.price !== '' && book.price !== undefined && book.price !== null && book.price !== '';

      if (hasTitle && !hasPrice) {
        newErrors[`book_price_${index}`] = 'Price is required';
        isValid = false;
      } else if (!hasTitle && hasPrice) {
        newErrors[`book_title_${index}`] = 'Title is required';
        isValid = false;
      } else if (hasTitle && hasPrice) {
        const priceVal = parseFloat(book.price);
        if (isNaN(priceVal) || priceVal < 0) {
          newErrors[`book_price_${index}`] = 'Must be non-negative';
          isValid = false;
        }
      }
    });

    // Validate Payment Status
    const { subtotal: booksSubtotal } = getBooksSubtotal();
    const feeValue = admissionFee ? parseFloat(admissionFee) : 0;
    const totalCollected = feeValue + booksSubtotal;

    if (totalCollected > 0) {
      if (!admissionPaymentStatus) {
        newErrors.paymentStatus = 'Please select a payment status for the admission total.';
        isValid = false;
      } else if (admissionPaymentStatus === 'custom_paid') {
        if (admissionAmountPaid === '' || admissionAmountPaid === undefined || admissionAmountPaid === null) {
          newErrors.amountPaid = 'Amount paid is required';
          isValid = false;
        } else {
          const paidVal = parseFloat(admissionAmountPaid);
          if (isNaN(paidVal) || paidVal < 0 || paidVal > totalCollected) {
            newErrors.amountPaid = `Amount paid must be between 0 and ${totalCollected.toFixed(2)}`;
            isValid = false;
          }
        }
      }
    }

    setAdmissionErrors(newErrors);
    return isValid;
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
    // No email validation needed
    if (formData.monthlyFeeAmount !== undefined && formData.monthlyFeeAmount !== '') {
      const feeVal = parseFloat(formData.monthlyFeeAmount);
      if (isNaN(feeVal) || feeVal < 0) {
        newErrors.monthlyFeeAmount = 'Monthly fee amount must be a non-negative number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !validateAdmission()) return;

    try {
      setSubmitting(true);
      
      // Clean email payload if empty
      const payload = {
        ...formData,
        address: formData.address.trim() || undefined,
        monthlyFeeAmount: formData.monthlyFeeAmount ? parseFloat(formData.monthlyFeeAmount) : 0
      };

      // Add admission fields only if section was expanded and contains data
      if (!student && isAdmissionExpanded) {
        const feeNum = admissionFee !== '' ? parseFloat(admissionFee) : 0;
        const validBooks = books
          .filter(b => b.title.trim() !== '' && b.price !== '' && b.price !== null)
          .map(b => ({ title: b.title.trim(), price: parseFloat(b.price) }));

        const totalCalculated = feeNum + validBooks.reduce((sum, b) => sum + b.price, 0);

        if (totalCalculated > 0) {
          payload.admissionFee = feeNum;
          payload.books = validBooks;
          payload.admissionPaymentStatus = admissionPaymentStatus;
          if (admissionPaymentStatus === 'custom_paid') {
            payload.admissionAmountPaid = parseFloat(admissionAmountPaid);
          }
        }
      }

      let res;
      if (student) {
        res = await updateStudent(student._id, payload);
      } else {
        res = await createStudent(payload);
      }

      if (res.success) {
        toast.success(student ? 'Student updated successfully' : 'Student created successfully');
        onSuccess(res.data);
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

  const { subtotal: booksSubtotal, hasCompletedRow } = getBooksSubtotal();
  const feeValue = admissionFee ? parseFloat(admissionFee) : 0;
  const showTotalLine = isAdmissionExpanded && (books.length > 0 || feeValue > 0);
  const totalCollected = feeValue + booksSubtotal;

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

            {/* Email field removed */}

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

            {/* Monthly Fee Amount */}
            <div className="flex flex-col">
              <label htmlFor="monthlyFeeAmount" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                Monthly Fee Amount (Rs.)
              </label>
              <input
                id="monthlyFeeAmount"
                type="number"
                name="monthlyFeeAmount"
                min="0"
                value={formData.monthlyFeeAmount}
                onChange={handleChange}
                placeholder="e.g. 5000"
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                  errors.monthlyFeeAmount ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                }`}
              />
              {errors.monthlyFeeAmount && (
                <span className="text-red-500 text-xs font-medium mt-1">{errors.monthlyFeeAmount}</span>
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

          {/* Admission Details Section (CREATE Mode Only) */}
          {!student && (
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-4">
              <button
                type="button"
                onClick={() => setIsAdmissionExpanded(!isAdmissionExpanded)}
                className="flex items-center justify-between w-full text-left font-bold text-navy-950 text-sm focus:outline-none"
              >
                <span>Admission Details (Optional)</span>
                {isAdmissionExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {isAdmissionExpanded && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  {/* Admission Fee Input */}
                  <div className="flex flex-col max-w-xs">
                    <label htmlFor="admissionFee" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
                      Admission Fee (Rs.)
                    </label>
                    <input
                      id="admissionFee"
                      type="number"
                      name="admissionFee"
                      min="0"
                      value={admissionFee}
                      onChange={(e) => {
                        setAdmissionFee(e.target.value);
                        if (admissionErrors.fee) {
                          setAdmissionErrors(prev => ({ ...prev, fee: '' }));
                        }
                      }}
                      placeholder="e.g. 1500"
                      className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm bg-white ${
                        admissionErrors.fee ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-navy-700'
                      }`}
                    />
                    {admissionErrors.fee && (
                      <span className="text-red-500 text-xs font-medium mt-1">{admissionErrors.fee}</span>
                    )}
                  </div>

                  {/* Book Details dynamic list */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-navy-950 uppercase block">
                      Book Details
                    </span>

                    {books.length > 0 && (
                      <div className="space-y-2">
                        {books.map((book, idx) => (
                          <div key={idx} className="flex items-start space-x-3">
                            <div className="flex-1 flex flex-col">
                              <input
                                type="text"
                                value={book.title}
                                onChange={(e) => handleBookChange(idx, 'title', e.target.value)}
                                placeholder="Book Title"
                                className={`w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/50 ${
                                  admissionErrors[`book_title_${idx}`] ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                                }`}
                              />
                              {admissionErrors[`book_title_${idx}`] && (
                                <span className="text-red-500 text-xs font-medium mt-1">{admissionErrors[`book_title_${idx}`]}</span>
                              )}
                            </div>

                            <div className="w-32 flex flex-col">
                              <input
                                type="number"
                                min="0"
                                value={book.price}
                                onChange={(e) => handleBookChange(idx, 'price', e.target.value)}
                                placeholder="Price"
                                className={`w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/50 ${
                                  admissionErrors[`book_price_${idx}`] ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-700'
                                }`}
                              />
                              {admissionErrors[`book_price_${idx}`] && (
                                <span className="text-red-500 text-xs font-medium mt-1">{admissionErrors[`book_price_${idx}`]}</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveBook(idx)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors focus:outline-none mt-0.5"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddBook}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-navy-700/30 text-navy-900 rounded-xl text-xs font-bold hover:bg-navy-50 transition-colors focus:outline-none"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Book</span>
                    </button>
                  </div>

                  {/* Books Subtotal */}
                  {hasCompletedRow && (
                    <div className="text-xs font-semibold text-gray-600 bg-gray-100/50 px-3 py-1.5 rounded-lg inline-block">
                      Books Subtotal: Rs. {booksSubtotal.toFixed(2)}
                    </div>
                  )}

                  {/* Payment Status Selector (Only if total Collected > 0) */}
                  {totalCollected > 0 && (
                    <div className="flex flex-col space-y-3 border-t border-gray-100 pt-3">
                      <span className="text-xs font-bold text-navy-950 uppercase">
                        Payment Status <span className="text-red-500">*</span>
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'fully_paid', label: 'Fully Paid' },
                          { value: 'unpaid', label: 'Unpaid' },
                          { value: 'custom_paid', label: 'Custom Paid' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setAdmissionPaymentStatus(opt.value);
                              if (opt.value !== 'custom_paid') {
                                setAdmissionAmountPaid('');
                              }
                              setAdmissionErrors(prev => {
                                const next = { ...prev };
                                delete next.paymentStatus;
                                delete next.amountPaid;
                                return next;
                              });
                            }}
                            className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all focus:outline-none ${
                              admissionPaymentStatus === opt.value
                                ? 'bg-navy-900 border-navy-900 text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {admissionErrors.paymentStatus && (
                        <span className="text-red-500 text-xs font-medium">{admissionErrors.paymentStatus}</span>
                      )}

                      {/* Custom Amount Paid input */}
                      {admissionPaymentStatus === 'custom_paid' && (
                        <div className="flex flex-col space-y-1.5 max-w-xs pt-1">
                          <label htmlFor="admissionAmountPaid" className="text-xs font-bold text-navy-950 uppercase">
                            Amount Paid (Rs.) <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="admissionAmountPaid"
                            type="number"
                            min="0"
                            max={totalCollected}
                            value={admissionAmountPaid}
                            onChange={(e) => {
                              setAdmissionAmountPaid(e.target.value);
                              setAdmissionErrors(prev => {
                                const next = { ...prev };
                                delete next.amountPaid;
                                return next;
                              });
                            }}
                            placeholder="e.g. 2000"
                            className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm bg-white ${
                              admissionErrors.amountPaid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-navy-700'
                            }`}
                          />
                          <span className="text-[10px] text-gray-400 font-semibold">Maximum: Rs. {totalCollected.toFixed(2)}</span>
                          {admissionErrors.amountPaid && (
                            <span className="text-red-500 text-xs font-medium">{admissionErrors.amountPaid}</span>
                          )}
                        </div>
                      )}

                      {/* Live Summary Line */}
                      {admissionPaymentStatus && (
                        <div className="text-xs font-semibold text-navy-800 bg-navy-50/50 border border-navy-100 p-2.5 rounded-xl leading-normal mt-1">
                          {admissionPaymentStatus === 'fully_paid' && "No remaining balance — fully settled at registration."}
                          {admissionPaymentStatus === 'unpaid' && `${totalCollected.toFixed(2)} will be added to this student's fee account as an outstanding due.`}
                          {admissionPaymentStatus === 'custom_paid' && (
                            <>
                              Rs. {parseFloat(admissionAmountPaid || 0).toFixed(2)} paid now — Rs. {Math.max(0, totalCollected - parseFloat(admissionAmountPaid || 0)).toFixed(2)} will be added as an outstanding due.
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total line */}
                  {showTotalLine && (
                    <div className="text-sm font-bold text-navy-950 border-t border-gray-100 pt-2.5 flex items-center justify-between">
                      <span>Total Collected at Admission:</span>
                      <span className="text-emerald-700 font-extrabold text-base">Rs. {totalCollected.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
