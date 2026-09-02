import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Users, User, Calendar, BookOpen, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClasses, getSectionsByClass, getStudents, issueBookCharge } from './bookService';

const SUGGESTED_BUNDLES = [
  { title: 'Standard Full Course Syllabus Set', price: 2500 },
  { title: 'Term 1 Books & Notebook Bundle', price: 1800 },
  { title: 'Term 2 Supplementary Books & Workbooks', price: 1500 },
  { title: 'Islamic Studies & Quranic Kit', price: 800 },
  { title: 'Pre-Primary Activity & Coloring Kit', price: 1200 }
];

const IssueBookModal = ({ isOpen, onClose, onSuccess }) => {
  const [targetType, setTargetType] = useState('class'); // 'class' | 'student'
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [bundleTitle, setBundleTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTargetType('class');
      setSelectedClassId('');
      setSelectedSectionId('');
      setSelectedStudentId('');
      setBundleTitle('Standard Full Course Syllabus Set');
      setAmount('2500');
      setDueDate('');
      loadClasses();
    }
  }, [isOpen]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await getClasses();
      if (res.success && Array.isArray(res.data)) {
        setClasses(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  // Load sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      setStudents([]);
      setSelectedStudentId('');
      return;
    }

    const loadSectionsAndStudents = async () => {
      try {
        const [secRes, studRes] = await Promise.all([
          getSectionsByClass(selectedClassId),
          getStudents({ classId: selectedClassId, status: 'active', limit: 100 })
        ]);
        if (secRes.success) setSections(secRes.data || []);
        if (studRes.success) setStudents(studRes.data?.students || studRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadSectionsAndStudents();
  }, [selectedClassId]);

  if (!isOpen) return null;

  const handleSelectBundle = (bundle) => {
    setBundleTitle(bundle.title);
    setAmount(String(bundle.price));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (targetType === 'class' && !selectedClassId) {
      toast.error('Please select a target class');
      return;
    }
    if (targetType === 'student' && !selectedStudentId) {
      toast.error('Please select a student');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        targetType,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        studentId: targetType === 'student' ? selectedStudentId : undefined,
        amount: parseFloat(amount),
        dueDate: dueDate || undefined,
        academicYear,
        items: [
          {
            title: bundleTitle.trim() || 'Course Books',
            price: parseFloat(amount),
            quantity: 1
          }
        ]
      };

      const res = await issueBookCharge(payload);
      if (res.success) {
        toast.success(res.message || 'Book fee charge issued successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to issue charge');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred while issuing charge');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-6 py-4 flex items-center justify-between text-white border-b border-navy-700">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-400/30">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Issue Book Fee / Package</h3>
              <p className="text-xs text-slate-300">Assign book sets to students or classes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left max-h-[80vh] overflow-y-auto">
          {/* Target Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Issue To
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('class')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border-2 transition-all ${
                  targetType === 'class'
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 font-bold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-medium'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="text-xs">Entire Class / Section</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('student')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border-2 transition-all ${
                  targetType === 'student'
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 font-bold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-medium'
                }`}
              >
                <User className="h-4 w-4" />
                <span className="text-xs">Individual Student</span>
              </button>
            </div>
          </div>

          {/* Class and Section Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-800 bg-white"
              >
                <option value="">-- Select Class --</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Section <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-800 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>{sec.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Individual Student Selector */}
          {targetType === 'student' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-700 block">
                Select Student <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                disabled={!selectedClassId}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-800 bg-white disabled:bg-slate-100"
              >
                <option value="">-- Choose Student --</option>
                {students.map((stud) => (
                  <option key={stud._id} value={stud._id}>
                    {stud.fullName} ({stud.registrationNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Quick Bundle Presets</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_BUNDLES.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectBundle(b)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 font-medium transition-colors text-slate-700"
                >
                  {b.title} (Rs. {b.price})
                </button>
              ))}
            </div>
          </div>

          {/* Title & Amount */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Package / Book Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bundleTitle}
                onChange={(e) => setBundleTitle(e.target.value)}
                placeholder="e.g. Grade 5 Complete Course Set"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Amount (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2500"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-slate-800 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Due Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm shadow-emerald-700/20 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Issuing Charges...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Issue Book Charges</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueBookModal;
