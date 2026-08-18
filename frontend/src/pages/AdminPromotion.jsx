import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, Users, Loader2, AlertTriangle, 
  ArrowRight, Check, X, Search, Sparkles, Filter, 
  RotateCcw, ShieldAlert, CheckCircle2, UserCheck, UserX,
  LayoutDashboard, Award, BookOpen, Wallet, TrendingUp, DollarSign, 
  CalendarCheck, BarChart3, Settings, HelpCircle, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/shared/DashboardLayout';
import api from '../services/api';
import { formatClassName } from '../utils/format';

const AdminPromotion = () => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Expense Tracker', icon: TrendingUp, path: '/admin/expenses' },
    { label: 'Salary Payroll', icon: DollarSign, path: '/admin/payroll' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'Promotion', icon: GraduationCap, path: '/admin/promotion' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  // State
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [targetSectionOverride, setTargetSectionOverride] = useState('');
  
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null); 
  // previewData structure: { sourceClass, targetClass, targetSections, students, isGraduation }
  
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'promoting', 'retaining'
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchSections(selectedClassId);
      loadPreviewForClass(selectedClassId, selectedSectionId);
    } else {
      setSections([]);
      setPreviewData(null);
      setSelectedStudentIds([]);
      setTargetSectionOverride('');
    }
  }, [selectedClassId, selectedSectionId]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      const sorted = (response.data?.data || []).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setClasses(sorted);
    } catch (_error) {
      toast.error('Failed to load academic classes');
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await api.get(`/sections?classId=${classId}`);
      setSections(response.data?.data || []);
    } catch (_error) {
      toast.error('Failed to load sections');
    }
  };

  const loadPreviewForClass = async (classId, sectionId) => {
    if (!classId) return;

    setLoadingPreview(true);
    setLastExecutionResult(null);

    try {
      let url = `/admin/promotion/preview?classId=${classId}`;
      if (sectionId) url += `&sectionId=${sectionId}`;

      const response = await api.get(url);
      const data = response.data?.data;
      if (data) {
        setPreviewData(data);
        // By default, select all active students for promotion
        if (data.students && Array.isArray(data.students)) {
          setSelectedStudentIds(data.students.map(s => s._id));
        } else {
          setSelectedStudentIds([]);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load class roster for promotion');
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Student selection handlers
  const handleToggleSelectAll = (select) => {
    if (select) {
      setSelectedStudentIds(previewData?.students?.map(s => s._id) || []);
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Execution handler
  const handleExecutePromotion = async () => {
    if (!selectedClassId || selectedStudentIds.length === 0) return;

    setIsExecuting(true);
    try {
      const payload = {
        classId: selectedClassId,
        studentIds: selectedStudentIds,
        action: previewData?.isGraduation ? 'graduate' : 'promote',
      };
      if (selectedSectionId) payload.sectionId = selectedSectionId;
      if (targetSectionOverride) payload.targetSectionId = targetSectionOverride;

      const response = await api.post('/admin/promotion/execute', payload);
      
      const successMessage = response.data?.message || 'Batch action executed successfully';
      toast.success(successMessage);
      
      setLastExecutionResult({
        action: previewData?.isGraduation ? 'graduate' : 'promote',
        count: response.data?.data?.promoted || response.data?.data?.graduated || selectedStudentIds.length,
        sourceClassName: previewData?.sourceClass?.name,
        targetClassName: previewData?.targetClass?.name || 'Alumni / Graduated',
        retainedCount: (previewData?.students?.length || 0) - selectedStudentIds.length,
      });

      setShowConfirmModal(false);
      
      // Reload class list or refresh preview
      loadPreviewForClass(selectedClassId, selectedSectionId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Promotion execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  // Filtered student list for table
  const filteredStudents = useMemo(() => {
    if (!previewData?.students) return [];

    let list = previewData.students;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
        (s.sectionId?.name && s.sectionId.name.toLowerCase().includes(q))
      );
    }

    // Tab filter
    if (activeFilterTab === 'promoting') {
      list = list.filter(s => selectedStudentIds.includes(s._id));
    } else if (activeFilterTab === 'retaining') {
      list = list.filter(s => !selectedStudentIds.includes(s._id));
    }

    return list;
  }, [previewData, searchQuery, activeFilterTab, selectedStudentIds]);

  // Derived metrics
  const totalEnrolled = previewData?.students?.length || 0;
  const promotingCount = selectedStudentIds.length;
  const retainingCount = Math.max(0, totalEnrolled - promotingCount);
  const isAllSelected = totalEnrolled > 0 && promotingCount === totalEnrolled;

  // Repeating students list for confirmation dialog
  const repeatingStudents = useMemo(() => {
    if (!previewData?.students) return [];
    return previewData.students.filter(s => !selectedStudentIds.includes(s._id));
  }, [previewData, selectedStudentIds]);

  const sourceClassNameFormatted = formatClassName(previewData?.sourceClass?.name);
  const targetClassNameFormatted = previewData?.isGraduation ? 'Class 10 Graduation (Alumni)' : formatClassName(previewData?.targetClass?.name);

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-[#00215E] to-[#0b388f] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 transform origin-bottom-right pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                <GraduationCap className="w-8 h-8 text-sky-300" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-sky-200 border border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                  <span>Annual Academic Operations</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Student Promotion & Graduation</h1>
                <p className="text-sm text-sky-100/80 max-w-2xl">
                  Batch-advance active cohorts to the next academic level, process Class 10 graduations, or selectively retain students repeating their current grade.
                </p>
              </div>
            </div>

            {/* Quick Helper Badge */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-xl text-xs font-medium self-start md:self-auto">
              <ShieldAlert className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span className="text-sky-100">Historical marks & fees remain fully intact</span>
            </div>
          </div>
        </div>

        {/* Success Banner (if just executed) */}
        {lastExecutionResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start justify-between gap-4 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  {lastExecutionResult.action === 'graduate' 
                    ? `Graduation Completed Successfully!` 
                    : `Promotion Completed Successfully!`}
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  <strong>{lastExecutionResult.count} student(s)</strong> moved from {formatClassName(lastExecutionResult.sourceClassName)} to <strong>{lastExecutionResult.targetClassName}</strong>.
                  {lastExecutionResult.retainedCount > 0 && (
                    <span className="ml-1 text-emerald-700">
                      ({lastExecutionResult.retainedCount} student(s) retained in {formatClassName(lastExecutionResult.sourceClassName)}).
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLastExecutionResult(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-3 py-1.5 bg-emerald-100/70 hover:bg-emerald-200 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pipeline Configuration Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-navy-950">1. Select Academic Cohort</h2>
              <p className="text-xs text-gray-500">Choose the source class to review student eligibility and destination</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              Step 1 of 2
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* Source Class Selection */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Source Class <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId('');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-gray-200 rounded-xl text-sm font-semibold text-navy-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
              >
                <option value="">-- Choose Class to Promote --</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {formatClassName(cls.name)} {cls.gender && cls.gender !== 'mixed' ? `(${cls.gender})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Section Filter */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Section Filter <span className="text-gray-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId || sections.length === 0}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-gray-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all disabled:opacity-50 disabled:bg-gray-100"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Destination Pipeline Badge */}
            <div className="md:col-span-5 flex items-center">
              {selectedClassId && previewData ? (
                <div className="w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Grade</span>
                    <span className="text-xs font-bold text-slate-800">{sourceClassNameFormatted}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#00215E] px-2">
                    <ArrowRight className="w-4 h-4 animate-pulse text-[#00215E]" />
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Destination</span>
                    <span className={`text-xs font-bold ${previewData.isGraduation ? 'text-emerald-700' : 'text-[#00215E]'}`}>
                      {previewData.isGraduation ? '🎓 Graduation' : targetClassNameFormatted}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full p-3 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                  Select a source class to visualize promotion destination
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Loading State */}
        {loadingPreview && (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-16 text-center space-y-3 shadow-sm">
            <Loader2 className="w-8 h-8 text-[#00215E] animate-spin mx-auto" />
            <p className="text-sm font-bold text-navy-950">Loading student cohort & destination details...</p>
            <p className="text-xs text-gray-400">Analyzing enrolled students and checking section structure</p>
          </div>
        )}

        {/* Active Class Preview & Roster Section */}
        {!loadingPreview && previewData && (
          <div className="space-y-6">
            
            {/* Stat Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Enrolled</span>
                  <div className="text-2xl font-black text-navy-950 mt-0.5">{totalEnrolled}</div>
                </div>
                <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    {previewData.isGraduation ? 'To Graduate' : 'To Advance'}
                  </span>
                  <div className="text-2xl font-black text-blue-900 mt-0.5">{promotingCount}</div>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Repeating in Grade</span>
                  <div className="text-2xl font-black text-amber-900 mt-0.5">{retainingCount}</div>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <UserX className="w-5 h-5" />
                </div>
              </div>

              <div className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
                previewData.isGraduation ? 'border-emerald-100' : 'border-[#00215E]/20'
              }`}>
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Target Level</span>
                  <div className="text-sm font-extrabold text-navy-950 truncate max-w-[140px] mt-1">
                    {previewData.isGraduation ? '🎓 Alumni Graduate' : targetClassNameFormatted}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${
                  previewData.isGraduation ? 'bg-emerald-50 text-emerald-700' : 'bg-[#00215E]/10 text-[#00215E]'
                }`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Main Student Checklist Table Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
              
              {/* Table Toolbar */}
              <div className="p-4 sm:p-5 border-b border-gray-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left: Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      activeFilterTab === 'all'
                        ? 'bg-[#00215E] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Students ({totalEnrolled})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('promoting')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      activeFilterTab === 'promoting'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Advancing ({promotingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('retaining')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      activeFilterTab === 'retaining'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Repeating in Grade ({retainingCount})
                  </button>
                </div>

                {/* Right: Search + Batch Selection Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Quick Search */}
                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student, reg no..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                    />
                  </div>

                  {/* Batch Selection Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(true)}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                      title="Select all students for promotion"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Select All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(false)}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                      title="Deselect all students"
                    >
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clear</span>
                    </button>
                  </div>

                </div>

              </div>

              {/* Notice / Guidance Strip */}
              <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100/60 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    <strong>Checked students</strong> will be promoted to <strong>{targetClassNameFormatted}</strong>. Uncheck any student who is repeating <strong>{sourceClassNameFormatted}</strong>.
                  </span>
                </div>
                <span className="font-bold text-blue-950 hidden sm:inline">
                  {promotingCount} of {totalEnrolled} selected
                </span>
              </div>

              {/* Roster Table Content */}
              {totalEnrolled === 0 ? (
                <div className="p-16 text-center text-gray-400 flex flex-col items-center space-y-2">
                  <Users className="w-12 h-12 text-gray-300" />
                  <p className="text-sm font-bold text-gray-600">No active students found in {sourceClassNameFormatted}</p>
                  <p className="text-xs text-gray-400">All students in this class might already be promoted, graduated, or inactive.</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center space-y-1.5">
                  <Filter className="w-8 h-8 text-gray-300" />
                  <p className="text-xs font-bold text-gray-600">No matching students found</p>
                  <p className="text-[11px] text-gray-400">Try clearing the search query or changing filter tab.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  
                  {/* Desktop Table View */}
                  <table className="w-full text-left hidden sm:table border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="py-3.5 px-5 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-[#00215E] focus:ring-[#00215E]/20 cursor-pointer"
                            title="Toggle all"
                          />
                        </th>
                        <th className="py-3.5 px-4">Student Name & ID</th>
                        <th className="py-3.5 px-4">Father Name</th>
                        <th className="py-3.5 px-4">Current Section</th>
                        <th className="py-3.5 px-5 text-right">Projected Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudentIds.includes(student._id);
                        const sectionName = student.sectionId?.name || 'A';
                        
                        return (
                          <tr 
                            key={student._id} 
                            onClick={() => handleToggleStudent(student._id)}
                            className={`transition-colors cursor-pointer select-none ${
                              isSelected 
                                ? 'bg-white hover:bg-blue-50/40' 
                                : 'bg-amber-50/30 hover:bg-amber-50/60'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(student._id)}
                                className="h-4 w-4 rounded border-gray-300 text-[#00215E] focus:ring-[#00215E]/20 cursor-pointer"
                              />
                            </td>

                            {/* Student Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isSelected 
                                    ? 'bg-[#00215E]/10 text-[#00215E]' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {student.fullName ? student.fullName.slice(0, 2).toUpperCase() : 'ST'}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-navy-950">
                                    {student.fullName || 'Unnamed Student'}
                                  </div>
                                  <div className="text-[11px] text-gray-400 font-mono">
                                    Reg: {student.registrationNumber || '-'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Father Name */}
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                              {student.fatherName || '-'}
                            </td>

                            {/* Current Section */}
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Sec {sectionName}
                              </span>
                            </td>

                            {/* Projected Outcome Badge */}
                            <td className="py-3.5 px-5 text-right">
                              {isSelected ? (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  previewData.isGraduation 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-blue-50 text-[#00215E] border border-blue-200'
                                }`}>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>
                                    {previewData.isGraduation ? '🎓 Graduate' : `Advance to ${targetClassNameFormatted}`}
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Repeat {sourceClassNameFormatted}</span>
                                </span>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Mobile Stacked Card View */}
                  <div className="block sm:hidden divide-y divide-gray-100">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student._id);
                      const sectionName = student.sectionId?.name || 'A';

                      return (
                        <div 
                          key={student._id}
                          onClick={() => handleToggleStudent(student._id)}
                          className={`p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                            isSelected ? 'bg-white' : 'bg-amber-50/40'
                          }`}
                        >
                          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStudent(student._id)}
                              className="h-4 w-4 rounded border-gray-300 text-[#00215E] focus:ring-[#00215E]/20"
                            />
                          </div>
                          
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-navy-950">{student.fullName}</span>
                              <span className="text-[10px] font-mono text-gray-400">{student.registrationNumber}</span>
                            </div>
                            
                            <div className="text-[11px] text-gray-500 flex items-center gap-2">
                              <span>Father: {student.fatherName || '-'}</span>
                              <span>•</span>
                              <span>Sec {sectionName}</span>
                            </div>

                            <div className="pt-1">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#00215E]">
                                  <Check className="w-3 h-3" />
                                  {previewData.isGraduation ? '🎓 Graduate' : `Advance to ${targetClassNameFormatted}`}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <RotateCcw className="w-3 h-3" />
                                  Repeat in {sourceClassNameFormatted}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

              {/* Bottom Execution Bar */}
              <div className="p-4 sm:p-5 border-t border-gray-200/80 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                <div className="text-xs text-slate-600 text-center sm:text-left">
                  Ready to process <strong>{promotingCount} student(s)</strong> out of {totalEnrolled} from {sourceClassNameFormatted}.
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={promotingCount === 0 || isExecuting}
                    className={`w-full sm:w-auto font-bold py-2.5 px-6 rounded-xl transition-all shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                      previewData.isGraduation
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#00215E] hover:opacity-90 text-white'
                    }`}
                  >
                    {previewData.isGraduation ? (
                      <>
                        <GraduationCap className="w-4 h-4" />
                        <span>Graduate {promotingCount} Students</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Promote {promotingCount} Students to {targetClassNameFormatted}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-2xl ${
                  previewData?.isGraduation ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#00215E]'
                }`}>
                  {previewData?.isGraduation ? <GraduationCap className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 text-[#00215E]" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-950">
                    {previewData?.isGraduation ? 'Confirm Student Graduation' : 'Confirm Cohort Promotion'}
                  </h3>
                  <p className="text-xs text-gray-500">Please review the summary below before executing</p>
                </div>
              </div>

              {/* Action Summary Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
                
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-gray-500 font-semibold">Source Class</span>
                  <span className="font-bold text-navy-950">{sourceClassNameFormatted}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-gray-500 font-semibold">Destination</span>
                  <span className={`font-bold ${previewData?.isGraduation ? 'text-emerald-700' : 'text-[#00215E]'}`}>
                    {previewData?.isGraduation ? '🎓 Class 10 Graduation (Alumni)' : targetClassNameFormatted}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-gray-500 font-semibold">
                    {previewData?.isGraduation ? 'Graduating Students' : 'Advancing Students'}
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {promotingCount} Student(s)
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500 font-semibold">Retaining in {sourceClassNameFormatted}</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {retainingCount} Student(s)
                  </span>
                </div>

              </div>

              {/* Retained Students Callout (if any) */}
              {repeatingStudents.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-amber-900 block">
                    ⚠️ {repeatingStudents.length} student(s) will NOT be promoted (Repeating):
                  </span>
                  <div className="text-[11px] text-amber-800 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {repeatingStudents.map(s => (
                      <span key={s._id} className="bg-white/80 border border-amber-300/80 px-2 py-0.5 rounded font-medium">
                        {s.fullName} ({s.registrationNumber})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isExecuting}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecutePromotion}
                  disabled={isExecuting}
                  className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer ${
                    previewData?.isGraduation
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-[#00215E] hover:opacity-90'
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm & Execute</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AdminPromotion;
