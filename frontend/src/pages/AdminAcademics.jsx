import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  CalendarCheck,
  DollarSign,
  BarChart3,
  Plus,
  Layers,
  BookMarked,
  Loader2,
  Wallet,
  TrendingUp,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
  UserCheck,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import ClassFormModal from '../features/academics/ClassFormModal';
import SectionFormModal from '../features/academics/SectionFormModal';
import SubjectFormModal from '../features/academics/SubjectFormModal';
import ConfirmModal from '../components/shared/ConfirmModal';
import { formatClassName, getInitials } from '../utils/format';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSectionsByClass,
  createSection,
  updateSection,
  deleteSection,
  getSubjectsByClass,
  createSubject,
  updateSubject,
  deleteSubject,
  assignClassTeacher,
  unassignClassTeacher,
  reorderClasses,
  reorderSections,
  reorderSubjects
} from '../features/academics/academicService';
import { getTeachers } from '../features/teachers/teacherService';

const AdminAcademics = () => {
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
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  // Core State
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  // Loading States
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Reorder Mode Toggles (Touch & Mobile Compatible)
  const [isReorderingClasses, setIsReorderingClasses] = useState(false);
  const [isReorderingSections, setIsReorderingSections] = useState(false);
  const [isReorderingSubjects, setIsReorderingSubjects] = useState(false);

  // Modal States
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClassItem, setEditingClassItem] = useState(null);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSectionItem, setEditingSectionItem] = useState(null);
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubjectItem, setEditingSubjectItem] = useState(null);
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger',
  });

  const activeClassIdRef = useRef(null);

  // 1. Fetch Classes & Teachers on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingClasses(true);
    try {
      const [classesRes, teachersRes] = await Promise.all([
        getClasses(),
        getTeachers(),
      ]);

      if (classesRes.success) {
        const fetchedClasses = classesRes.data || [];
        setClasses(fetchedClasses);
        if (fetchedClasses.length > 0) {
          setClassDetails(fetchedClasses[0]);
        }
      }

      if (teachersRes.success) {
        setTeachers(teachersRes.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load academic data');
    } finally {
      setLoadingClasses(false);
    }
  };

  // 2. Select Class and Load Its Sections & Subjects
  const setClassDetails = async (classDoc) => {
    if (!classDoc) return;
    setSelectedClass(classDoc);
    activeClassIdRef.current = classDoc._id;
    setLoadingSections(true);
    setLoadingSubjects(true);

    try {
      const [secsRes, subsRes] = await Promise.all([
        getSectionsByClass(classDoc._id),
        getSubjectsByClass(classDoc._id),
      ]);

      if (activeClassIdRef.current === classDoc._id) {
        if (secsRes.success) setSections(secsRes.data || []);
        if (subsRes.success) setSubjects(subsRes.data || []);
      }
    } catch (err) {
      toast.error('Error fetching class structure');
    } finally {
      if (activeClassIdRef.current === classDoc._id) {
        setLoadingSections(false);
        setLoadingSubjects(false);
      }
    }
  };

  // =========================================================================
  // CLASS ACTIONS
  // =========================================================================
  const handleSaveClass = async (formData) => {
    setIsSubmittingClass(true);
    try {
      if (editingClassItem) {
        const res = await updateClass(editingClassItem._id, formData);
        if (res.success) {
          toast.success('Class updated successfully');
          setClasses(prev => prev.map(c => c._id === editingClassItem._id ? res.data : c));
          if (selectedClass?._id === editingClassItem._id) {
            setSelectedClass(res.data);
          }
          setClassModalOpen(false);
          setEditingClassItem(null);
        } else {
          toast.error(res.message || 'Failed to update class');
        }
      } else {
        const res = await createClass(formData);
        if (res.success) {
          toast.success('Class created successfully');
          setClasses(prev => [...prev, res.data]);
          if (!selectedClass) {
            setClassDetails(res.data);
          }
          setClassModalOpen(false);
        } else {
          toast.error(res.message || 'Failed to create class');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving class');
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleDeleteClass = (classDoc) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete ' + formatClassName(classDoc.name),
      message: 'Are you sure you want to delete "' + formatClassName(classDoc.name) + '"? All associated sections and subjects will be affected. This action cannot be undone.',
      confirmText: 'Delete Class',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteClass(classDoc._id);
          if (res.success) {
            toast.success('Class deleted successfully');
            const updated = classes.filter(c => c._id !== classDoc._id);
            setClasses(updated);
            if (selectedClass?._id === classDoc._id) {
              if (updated.length > 0) {
                setClassDetails(updated[0]);
              } else {
                setSelectedClass(null);
                setSections([]);
                setSubjects([]);
              }
            }
          } else {
            toast.error(res.message || 'Failed to delete class');
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error deleting class');
        }
      }
    });
  };

  const handleMoveClassOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;

    const updated = [...classes];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setClasses(updated);

    try {
      await reorderClasses(updated.map(c => c._id));
    } catch (err) {
      toast.error('Failed to save class order');
    }
  };

  // =========================================================================
  // SECTION ACTIONS
  // =========================================================================
  const handleSaveSection = async (formData) => {
    if (!selectedClass) return;
    setIsSubmittingSection(true);
    try {
      if (editingSectionItem) {
        const res = await updateSection(editingSectionItem._id, { name: formData.name });
        if (res.success) {
          const currentTeacherId = editingSectionItem.classTeacherId ? (editingSectionItem.classTeacherId._id || editingSectionItem.classTeacherId) : null;
          if (formData.classTeacherId !== currentTeacherId) {
            if (formData.classTeacherId) {
              await assignClassTeacher(editingSectionItem._id, formData.classTeacherId);
            } else {
              await unassignClassTeacher(editingSectionItem._id);
            }
          }
          toast.success('Section updated successfully');
          fetchSectionsForClass(selectedClass._id);
          setSectionModalOpen(false);
          setEditingSectionItem(null);
        } else {
          toast.error(res.message || 'Failed to update section');
        }
      } else {
        const res = await createSection({ name: formData.name, classId: selectedClass._id });
        if (res.success) {
          if (formData.classTeacherId && res.data?._id) {
            await assignClassTeacher(res.data._id, formData.classTeacherId);
          }
          toast.success('Section created successfully');
          fetchSectionsForClass(selectedClass._id);
          setSectionModalOpen(false);
        } else {
          toast.error(res.message || 'Failed to create section');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving section');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    const res = await getSectionsByClass(classId);
    if (res.success) {
      setSections(res.data || []);
    }
  };

  const handleDeleteSection = (sectionId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Section',
      message: 'Are you sure you want to delete this section? Students must be reassigned first.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteSection(sectionId);
          if (res.success) {
            toast.success('Section deleted successfully');
            setSections(prev => prev.filter(s => s._id !== sectionId));
          } else {
            toast.error(res.message || 'Failed to delete section');
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error deleting section');
        }
      }
    });
  };

  const handleMoveSectionOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updated = [...sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setSections(updated);

    try {
      await reorderSections(selectedClass._id, updated.map(s => s._id));
    } catch (err) {
      toast.error('Failed to save section order');
    }
  };

  // =========================================================================
  // SUBJECT ACTIONS
  // =========================================================================
  const handleSaveSubject = async (formData) => {
    if (!selectedClass) return;
    setIsSubmittingSubject(true);
    try {
      if (editingSubjectItem) {
        const res = await updateSubject(editingSubjectItem._id, { name: formData.name });
        if (res.success) {
          toast.success('Subject updated successfully');
          setSubjects(prev => prev.map(s => s._id === editingSubjectItem._id ? { ...s, name: formData.name } : s));
          setSubjectModalOpen(false);
          setEditingSubjectItem(null);
        } else {
          toast.error(res.message || 'Failed to update subject');
        }
      } else {
        const res = await createSubject({ name: formData.name, classId: selectedClass._id });
        if (res.success) {
          toast.success('Subject added successfully');
          setSubjects(prev => [...prev, res.data]);
          setSubjectModalOpen(false);
        } else {
          toast.error(res.message || 'Failed to add subject');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving subject');
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  const handleDeleteSubject = (subjectId, subjectName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete ' + subjectName,
      message: 'Are you sure you want to delete "' + subjectName + '"? This cannot be undone if no grades depend on it.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteSubject(subjectId);
          if (res.success) {
            toast.success('Subject deleted successfully');
            setSubjects(prev => prev.filter(s => s._id !== subjectId));
          } else {
            toast.error(res.message || 'Failed to delete subject');
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error deleting subject');
        }
      }
    });
  };

  const handleMoveSubjectOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    const updated = [...subjects];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setSubjects(updated);

    try {
      await reorderSubjects(selectedClass._id, updated.map(s => s._id));
    } catch (err) {
      toast.error('Failed to save subject order');
    }
  };

  // Helper to find teacher name by ID
  const getTeacherObj = (teacherId) => {
    if (!teacherId) return null;
    const tId = teacherId._id || teacherId;
    return teachers.find(t => t._id.toString() === tId.toString()) || (teacherId._id ? teacherId : null);
  };

  // Filtered Classes
  const filteredClasses = classes.filter(cls => {
    const matchesGender = genderFilter === 'all' || cls.gender === genderFilter;
    const matchesSearch = !searchTerm || cls.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchesGender && matchesSearch;
  });

  return (
    <DashboardLayout navItems={navItems} subtitle="Administrative Suite">
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Academic Structure</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure Classes, Sections, Class Teachers, and Curriculum Subjects in one unified workstation.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setEditingClassItem(null);
                setClassModalOpen(true);
              }}
              className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Class</span>
            </button>
          </div>
        </div>

        {/* 2-PANE ENTERPRISE WORKSTATION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========== LEFT PANE: CLASSES LIST (4/12) ========== */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col min-h-[540px]">
            
            {/* Pane Header & Reorder Toggle */}
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Classes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {classes.length} academic grades
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderingClasses(!isReorderingClasses)}
                className={'px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex items-center space-x-1.5 ' + (
                  isReorderingClasses
                    ? 'bg-navy-900 text-white border-navy-900 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                )}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>{isReorderingClasses ? 'Done' : 'Reorder'}</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-2.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </div>

            {/* Gender Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-3">
              {[
                { key: 'all', label: 'All' },
                { key: 'mixed', label: 'Mixed' },
                { key: 'male', label: 'Boys' },
                { key: 'female', label: 'Girls' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setGenderFilter(tab.key)}
                  className={'py-1 text-[10px] font-bold rounded-lg transition-all ' + (
                    genderFilter === tab.key
                      ? 'bg-white dark:bg-slate-800 text-navy-900 dark:text-sky-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Classes Scroll List */}
            <div className="space-y-2 flex-grow overflow-y-auto max-h-[480px] pr-1">
              {loadingClasses ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                  <span className="text-xs mt-2 font-medium">Loading classes...</span>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                  <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No classes found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Adjust your search or create a new class.</p>
                </div>
              ) : (
                filteredClasses.map((cls) => {
                  const isSelected = selectedClass?._id === cls._id;
                  const realIndex = classes.findIndex(c => c._id === cls._id);

                  return (
                    <div
                      key={cls._id}
                      onClick={() => { setClassDetails(cls); }}
                      className={'p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ' + (
                        isSelected
                          ? 'border-navy-900 bg-navy-50/50 dark:bg-sky-950/30 dark:border-sky-500 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      )}
                    >
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {formatClassName(cls.name)}
                          </span>
                          <GenderTag gender={cls.gender} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[0.70rem] text-slate-500 dark:text-slate-400">
                          <span>
                            Fee: <strong className="text-navy-900 dark:text-sky-300 font-bold">Rs. {(cls.defaultFee || 0).toLocaleString()}</strong>/mo
                          </span>
                        </div>
                      </div>

                      {/* Reorder Mode Controls */}
                      {isReorderingClasses && (
                        <div className="flex items-center space-x-1 pl-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={realIndex === 0}
                            onClick={() => handleMoveClassOrder(realIndex, 'up')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-all"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={realIndex === classes.length - 1}
                            onClick={() => handleMoveClassOrder(realIndex, 'down')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-all"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========== RIGHT PANE: CLASS WORKSPACE (8/12) ========== */}
          <div className="lg:col-span-8 space-y-5">
            
            {!selectedClass ? (
              <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col items-center justify-center text-center min-h-[480px]">
                <Layers className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No Class Selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Please select a class from the left list to configure its sections, teachers, and curriculum subjects.
                </p>
              </div>
            ) : (
              <>
                {/* Active Class Overview Card */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {formatClassName(selectedClass.name)}
                      </h2>
                      <GenderTag gender={selectedClass.gender} />
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Default Monthly Fee: <strong className="text-navy-900 dark:text-sky-300 font-bold">Rs. {(selectedClass.defaultFee || 0).toLocaleString()}</strong> / mo</span>
                      <span className="text-slate-300">•</span>
                      <span>{sections.length} Sections</span>
                      <span className="text-slate-300">•</span>
                      <span>{subjects.length} Subjects</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClassItem(selectedClass);
                        setClassModalOpen(true);
                      }}
                      className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit Class</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClass(selectedClass)}
                      className="p-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete Class"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* SECTIONS & CLASS TEACHERS CARD */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Sections & Class Teachers
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage section divisions and assigned faculty leads
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsReorderingSections(!isReorderingSections)}
                        className={'px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex items-center space-x-1 ' + (
                          isReorderingSections
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        <span>{isReorderingSections ? 'Done' : 'Reorder'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionItem(null);
                          setSectionModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Section</span>
                      </button>
                    </div>
                  </div>

                  {loadingSections ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                      <span className="text-xs mt-2 font-medium">Loading sections...</span>
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50">
                      <Layers className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-1.5" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No sections created yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Add sections like Section A and assign class teachers.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {sections.map((sec, index) => {
                        const teacherObj = getTeacherObj(sec.classTeacherId);
                        const teacherName = teacherObj ? (teacherObj.userId?.name || teacherObj.name || 'Teacher') : null;
                        const empId = teacherObj ? (teacherObj.employeeId || '') : '';

                        return (
                          <div
                            key={sec._id}
                            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col justify-between space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-lg bg-navy-900 text-white font-bold text-xs flex items-center justify-center">
                                  {sec.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  Section {sec.name}
                                </span>
                              </div>

                              {isReorderingSections ? (
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => handleMoveSectionOrder(index, 'up')}
                                    className="p-1 rounded border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === sections.length - 1}
                                    onClick={() => handleMoveSectionOrder(index, 'down')}
                                    className="p-1 rounded border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSectionItem(sec);
                                      setSectionModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-navy-900 dark:hover:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Section Settings"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSection(sec._id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                    title="Delete Section"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Class Teacher Initials Avatar Block */}
                            <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                              {teacherName ? (
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-6 h-6 rounded-full bg-navy-900 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                    {getInitials(teacherName)}
                                  </div>
                                  <div className="truncate">
                                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {teacherName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">Lead {empId ? '(' + empId + ')' : ''}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5 text-slate-400">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  <span className="text-[11px] italic">No Class Teacher</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CURRICULUM SUBJECTS CARD */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Curriculum Subjects
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Academic courses taught in this class
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsReorderingSubjects(!isReorderingSubjects)}
                        className={'px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all flex items-center space-x-1 ' + (
                          isReorderingSubjects
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        <span>{isReorderingSubjects ? 'Done' : 'Reorder'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubjectItem(null);
                          setSubjectModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Subject</span>
                      </button>
                    </div>
                  </div>

                  {loadingSubjects ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                      <span className="text-xs mt-2 font-medium">Loading subjects...</span>
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50">
                      <BookMarked className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-1.5" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No subjects added yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Add subjects like Math, Science, English for this class.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {subjects.map((sub, index) => (
                        <div
                          key={sub._id}
                          className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-navy-900 flex-shrink-0" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words">
                              {sub.name}
                            </span>
                          </div>

                          {isReorderingSubjects ? (
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveSubjectOrder(index, 'up')}
                                className="p-1 rounded border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={index === subjects.length - 1}
                                onClick={() => handleMoveSubjectOrder(index, 'down')}
                                className="p-1 rounded border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubjectItem(sub);
                                  setSubjectModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-navy-900 dark:hover:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Edit Subject"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(sub._id, sub.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                                title="Delete Subject"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </>
            )}
          </div>

        </div>

      </div>

      {/* Class Modal */}
      <ClassFormModal
        isOpen={classModalOpen}
        onClose={() => { setClassModalOpen(false); setEditingClassItem(null); }}
        onSubmit={handleSaveClass}
        isSubmitting={isSubmittingClass}
        classItem={editingClassItem}
      />

      {/* Section Modal */}
      <SectionFormModal
        isOpen={sectionModalOpen}
        onClose={() => { setSectionModalOpen(false); setEditingSectionItem(null); }}
        onSubmit={handleSaveSection}
        isSubmitting={isSubmittingSection}
        section={editingSectionItem}
        className={selectedClass ? formatClassName(selectedClass.name) : ''}
        teachers={teachers}
      />

      {/* Subject Modal */}
      <SubjectFormModal
        isOpen={subjectModalOpen}
        onClose={() => { setSubjectModalOpen(false); setEditingSubjectItem(null); }}
        onSubmit={handleSaveSubject}
        isSubmitting={isSubmittingSubject}
        subject={editingSubjectItem}
        className={selectedClass ? formatClassName(selectedClass.name) : ''}
        existingSubjects={subjects}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </DashboardLayout>
  );
};

/** Explicit Gender Badge */
const GenderTag = ({ gender }) => {
  if (gender === 'male') {
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300">
        Boys Only
      </span>
    );
  }
  if (gender === 'female') {
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300">
        Girls Only
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
      Mixed (Co-Ed)
    </span>
  );
};

export default AdminAcademics;
