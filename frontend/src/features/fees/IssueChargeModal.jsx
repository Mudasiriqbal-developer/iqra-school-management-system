import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Users, User, Layers, Calendar, DollarSign, Search, Check, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClasses, getSectionsByClass, getStudents, issueOneTimeCharge } from './feeService';

const SUGGESTED_TITLES = [
  'Mid-Term Examination Fee',
  'Final Term Examination Fee',
  'Monthly Test & Paper Fund',
  'Annual Sports & Activity Kit',
  'Lab & Computer Fund',
  'Field Trip / Educational Tour'
];

const IssueChargeModal = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [targetType, setTargetType] = useState('class'); // 'class' | 'individual'

  // Class / Section selection
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Individual student selection
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  // Loading & stats
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [targetCount, setTargetCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setDueDate('');
      setTargetType('class');
      setSelectedClassId('');
      setSelectedSectionId('');
      setSelectedStudentIds([]);
      setStudentSearch('');
      setStudentClassFilter('');
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      setLoadingClasses(true);
      const res = await getClasses();
      if (res.success && Array.isArray(res.data)) {
        setClasses(res.data);
        if (res.data.length > 0) {
          setSelectedClassId(res.data[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }

    const fetchSections = async () => {
      try {
        const res = await getSectionsByClass(selectedClassId);
        if (res.success && Array.isArray(res.data)) {
          setSections(res.data);
          setSelectedSectionId(''); // default to All Sections
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSections();
  }, [selectedClassId]);

  // Fetch students for individual selection or target count preview
  useEffect(() => {
    if (!isOpen) return;

    const fetchStudentsList = async () => {
      try {
        setLoadingStudents(true);
        const params = { limit: 1000, status: 'active' };
        const res = await getStudents(params);
        if (res.success) {
          const list = res.data?.students || res.data || [];
          setAllStudents(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentsList();
  }, [isOpen]);

  // Calculate target student count dynamically
  useEffect(() => {
    if (targetType === 'individual') {
      setTargetCount(selectedStudentIds.length);
    } else {
      if (!selectedClassId) {
        setTargetCount(0);
        return;
      }
      const count = allStudents.filter(s => {
        const studentClassId = s.classId?._id || s.classId;
        const studentSecId = s.sectionId?._id || s.sectionId;
        if (studentClassId?.toString() !== selectedClassId.toString()) return false;
        if (selectedSectionId && studentSecId?.toString() !== selectedSectionId.toString()) return false;
        return s.status === 'active';
      }).length;
      setTargetCount(count);
    }
  }, [targetType, selectedClassId, selectedSectionId, selectedStudentIds, allStudents]);

  if (!isOpen) return null;

  const handleToggleStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFilteredStudents = (filteredList) => {
    const filteredIds = filteredList.map(s => s._id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedStudentIds, ...filteredIds]));
      setSelectedStudentIds(combined);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a charge title or reason');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive charge amount');
      return;
    }

    if (targetType === 'individual' && selectedStudentIds.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (targetType === 'class' && !selectedClassId) {
      toast.error('Please select a target class');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        amount: numAmount,
        dueDate: dueDate || null,
        targetType,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
        studentIds: targetType === 'individual' ? selectedStudentIds : undefined
      };

      const res = await issueOneTimeCharge(payload);
      if (res.success) {
        toast.success(res.message || `Successfully issued charge to ${res.data?.issuedCount || targetCount} students`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to issue charge');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred while issuing charge');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered students for individual selector
  const filteredStudents = allStudents.filter(s => {
    if (studentClassFilter) {
      const sClassId = s.classId?._id || s.classId;
      if (sClassId?.toString() !== studentClassFilter.toString()) return false;
    }
    if (studentSearch.trim()) {
      const query = studentSearch.toLowerCase().trim();
      const matchName = s.fullName?.toLowerCase().includes(query);
      const matchReg = s.registrationNumber?.toLowerCase().includes(query);
      const matchFather = s.fatherName?.toLowerCase().includes(query);
      return matchName || matchReg || matchFather;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-150 dark:border-slate-700 overflow-hidden transform transition-all my-8">
        
        {/* Header */}
        <div className="bg-navy-900 px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <PlusCircle className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Issue One-Time Charge</h2>
              <p className="text-xs text-slate-200 font-medium mt-0.5">
                Issue exam fees, paper funds, activity kits, or special fees to students
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Charge Title & Suggestions */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Charge Title / Reason <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Mid-Term Exam Fee 2026, Paper Fund, Sports Kit"
                className="w-full pl-3.5 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-primary focus:border-transparent"
                required
              />
            </div>
            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mr-1 self-center">Presets:</span>
              {SUGGESTED_TITLES.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTitle(t)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-300 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-semibold transition-colors border border-slate-200/60 dark:border-slate-600"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount and Due Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Amount per Student (Rs.) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">Rs.</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-navy-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Due Date <span className="text-slate-400 lowercase font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Target Audience Mode */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Target Audience
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('class')}
                className={`p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
                  targetType === 'class'
                    ? 'border-navy-primary bg-navy-50/50 dark:bg-navy-950/40 ring-2 ring-navy-primary/20 text-navy-950 dark:text-slate-100 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium hover:border-slate-300'
                }`}
              >
                <Users className={`h-5 w-5 ${targetType === 'class' ? 'text-navy-primary dark:text-sky-400' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="text-xs">Entire Class / Section</p>
                  <p className="text-[10px] text-slate-400 font-normal">All active students in selected class</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('individual')}
                className={`p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
                  targetType === 'individual'
                    ? 'border-navy-primary bg-navy-50/50 dark:bg-navy-950/40 ring-2 ring-navy-primary/20 text-navy-950 dark:text-slate-100 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium hover:border-slate-300'
                }`}
              >
                <User className={`h-5 w-5 ${targetType === 'individual' ? 'text-navy-primary dark:text-sky-400' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="text-xs">Specific Students</p>
                  <p className="text-[10px] text-slate-400 font-normal">Hand-pick individual recipients</p>
                </div>
              </button>
            </div>
          </div>

          {/* Mode 1: Class and Section Picker */}
          {targetType === 'class' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Select Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-primary"
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.gender && c.gender !== 'mixed' ? `(${c.gender})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Select Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-primary"
                >
                  <option value="">All Sections in Class</option>
                  {sections.map(s => (
                    <option key={s._id} value={s._id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Mode 2: Individual Student Multi-Select List */}
          {targetType === 'individual' && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by student name, roll no, father name..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-primary"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-primary"
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.gender && c.gender !== 'mixed' ? `(${c.gender})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select All / Clear Row */}
              <div className="flex justify-between items-center px-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  Found <strong className="text-slate-800 dark:text-slate-200">{filteredStudents.length}</strong> matching students
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectAllFilteredStudents(filteredStudents)}
                  className="text-navy-primary dark:text-sky-400 font-bold hover:underline"
                >
                  {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s._id))
                    ? 'Deselect Filtered'
                    : 'Select All Filtered'}
                </button>
              </div>

              {/* Scrollable Checkbox List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                {loadingStudents ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading student records...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    No active students found matching your filters.
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const isSelected = selectedStudentIds.includes(student._id);
                    const classNameStr = student.classId?.name || 'N/A';
                    const secNameStr = student.sectionId?.name || '';
                    return (
                      <label
                        key={student._id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40'
                            : 'hover:bg-white dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudent(student._id)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{student.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Reg: <span className="font-semibold text-slate-600 dark:text-slate-300">{student.registrationNumber}</span> • {classNameStr} {secNameStr ? `(${secNameStr})` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{student.fatherName}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Issuance Impact Banner */}
          <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-purple-900 dark:text-purple-200">
                Charge Issuance Summary
              </p>
              <p className="text-purple-700 dark:text-purple-300 font-medium">
                This will create a new one-time fee charge of{' '}
                <strong>Rs. {parseFloat(amount) ? parseFloat(amount).toLocaleString() : '0'}</strong> for{' '}
                <strong>{targetCount}</strong> student(s). Total billing: <strong>Rs. {((parseFloat(amount) || 0) * targetCount).toLocaleString()}</strong>.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || targetCount === 0 || !title.trim() || !amount}
              className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Issuing Charges...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Issue Charges ({targetCount})</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default IssueChargeModal;
