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
  Check,
  X,
  GripVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import InlineEditableRow from '../features/academics/InlineEditableRow';
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
import ConfirmModal from '../components/shared/ConfirmModal';
import { formatClassName, formatClassNameWithGender } from '../utils/format';

const AdminAcademics = () => {
  // Sidebar items
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
  ];

  // Core academic state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [genderFilter, setGenderFilter] = useState('all');
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Loading states
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Ref to track the currently active/selected class ID for avoiding fetch race conditions
  const activeClassIdRef = useRef(null);

  // Form toggle states
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGender, setNewClassGender] = useState('mixed');

  // Class editing states
  const [editingClassId, setEditingClassId] = useState(null);
  const [editClassNameValue, setEditClassNameValue] = useState('');
  const [editClassGenderValue, setEditClassGenderValue] = useState('mixed');

  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Section specific editing & teacher assignment states
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editSectionValue, setEditSectionValue] = useState('');
  const [assigningSectionId, setAssigningSectionId] = useState(null);

  // Drag and drop states & refs
  const dragSourceIndexRef = useRef(null);
  const dragTypeRef = useRef(null);
  const [dragOverInfo, setDragOverInfo] = useState(null); // { type: 'class'|'section'|'subject', index: number }

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger',
  });

  const handleDragOver = (e, index, type) => {
    if (dragTypeRef.current !== type) return;
    e.preventDefault();
    setDragOverInfo({ type, index });
  };

  const handleDragLeave = () => {
    setDragOverInfo(null);
  };

  const handleDragEnd = () => {
    dragSourceIndexRef.current = null;
    dragTypeRef.current = null;
    setDragOverInfo(null);
  };

  const handleDrop = async (e, targetIndex, type) => {
    e.preventDefault();
    if (dragTypeRef.current !== type) return;
    const sourceIndex = dragSourceIndexRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    if (type === 'class') {
      const updated = [...classes];
      const [removed] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, removed);
      setClasses(updated);

      try {
        await reorderClasses(updated.map(c => c._id));
        toast.success('Classes reordered');
      } catch (_err) {
        toast.error('Failed to save class order');
        fetchClasses();
      }
    } else if (type === 'section') {
      const updated = [...sections];
      const [removed] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, removed);
      setSections(updated);

      try {
        await reorderSections(updated.map(s => s._id));
        toast.success('Sections reordered');
      } catch (_err) {
        toast.error('Failed to save section order');
        if (selectedClass) {
          fetchDetailsForClass(selectedClass._id);
        }
      }
    } else if (type === 'subject') {
      const updated = [...subjects];
      const [removed] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, removed);
      setSubjects(updated);

      try {
        await reorderSubjects(updated.map(s => s._id));
        toast.success('Subjects reordered');
      } catch (_err) {
        toast.error('Failed to save subject order');
        if (selectedClass) {
          fetchDetailsForClass(selectedClass._id);
        }
      }
    }
  };

  // Fetch all classes on mount
  const fetchClasses = async (autoSelectId = null) => {
    setLoadingClasses(true);
    try {
      const res = await getClasses();
      if (res.success) {
        const fetchedClasses = res.data || [];
        setClasses(fetchedClasses);

        // Selection logic
        if (fetchedClasses.length > 0) {
          if (autoSelectId) {
            const found = fetchedClasses.find(c => c._id === autoSelectId);
            if (found) setSelectedClass(found);
          } else {
            // Keep current selection if still valid, or auto-select first class
            setSelectedClass((prev) => {
              if (prev) {
                const stillExists = fetchedClasses.find(c => c._id === prev._id);
                if (stillExists) return stillExists;
              }
              return fetchedClasses[0];
            });
          }
        } else {
          setSelectedClass(null);
        }
      } else {
        toast.error(res.message || 'Failed to load classes');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error loading classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch sections and subjects for selected class
  const fetchDetailsForClass = async (classId) => {
    setLoadingSections(true);
    setLoadingSubjects(true);
    try {
      const [sectionsRes, subjectsRes] = await Promise.all([
        getSectionsByClass(classId),
        getSubjectsByClass(classId)
      ]);

      // Only update state if this class is still the active class
      if (activeClassIdRef.current !== classId) return;

      if (sectionsRes.success) {
        setSections(sectionsRes.data || []);
      } else {
        toast.error(sectionsRes.message || 'Failed to load sections');
      }

      if (subjectsRes.success) {
        setSubjects(subjectsRes.data || []);
      } else {
        toast.error(subjectsRes.message || 'Failed to load subjects');
      }
    } catch (err) {
      console.error(err);
      if (activeClassIdRef.current === classId) {
        toast.error('Server error loading class details');
      }
    } finally {
      if (activeClassIdRef.current === classId) {
        setLoadingSections(false);
        setLoadingSubjects(false);
      }
    }
  };

  // Fetch teachers list
  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await getTeachers();
      if (res.success) {
        setTeachers(res.data || []);
      } else {
        toast.error(res.message || 'Failed to load teachers');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error loading teachers');
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    const classId = selectedClass?._id;
    activeClassIdRef.current = classId;
    setSections([]);
    setSubjects([]);

    if (classId) {
      fetchDetailsForClass(classId);
    }
  }, [selectedClass?._id]);

  // Class teacher assignments
  const handleAssignTeacher = async (sectionId, teacherId) => {
    try {
      const res = await assignClassTeacher(sectionId, teacherId);
      if (res.success) {
        toast.success('Class teacher assigned successfully');
        setSections(prev => prev.map(s => s._id === sectionId ? res.data : s));
        setAssigningSectionId(null);
      } else {
        toast.error(res.message || 'Failed to assign teacher');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error assigning teacher';
      toast.error(msg);
    }
  };

  const handleUnassignTeacher = async (sectionId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Class Teacher',
      message: 'Are you sure you want to remove the Class Teacher from this section?',
      confirmText: 'Remove',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await unassignClassTeacher(sectionId);
          if (res.success) {
            toast.success('Class teacher removed successfully');
            setSections(prev => prev.map(s => s._id === sectionId ? res.data : s));
          } else {
            toast.error(res.message || 'Failed to remove teacher');
          }
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || 'Error removing teacher');
        }
      }
    });
  };

  const getTeacherName = (classTeacherId) => {
    if (!classTeacherId) return '';
    if (typeof classTeacherId === 'object' && classTeacherId.userId?.name) {
      return classTeacherId.userId.name;
    }
    const teacherId = typeof classTeacherId === 'object' ? classTeacherId._id : classTeacherId;
    const found = teachers.find(t => t._id === teacherId);
    return found?.userId?.name || 'Assigned Teacher';
  };

  // Class Handlers
  const handleAddClass = async (e) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    try {
      const res = await createClass({ name, gender: newClassGender });
      if (res.success) {
        toast.success('Class created successfully');
        setNewClassName('');
        setNewClassGender('mixed');
        setIsAddingClass(false);
        // Refresh classes and select the newly created class
        await fetchClasses(res.data?._id);
      } else {
        toast.error(res.message || 'Failed to create class');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating class');
    }
  };

  const handleUpdateClass = async (id, newName, newGender) => {
    try {
      const res = await updateClass(id, { name: newName, gender: newGender });
      if (res.success) {
        toast.success('Class updated successfully');
        setClasses(prev => prev.map(c => c._id === id ? { ...c, name: newName, gender: newGender } : c));
        setSelectedClass(prev => prev && prev._id === id ? { ...prev, name: newName, gender: newGender } : prev);
      } else {
        toast.error(res.message || 'Failed to update class');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating class');
    }
  };

  const handleDeleteClass = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Class',
      message: 'Are you sure you want to delete this class? This cannot be undone if no data depends on it.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteClass(id);
          if (res.success) {
            toast.success('Class deleted successfully');
            const remaining = classes.filter(c => c._id !== id);
            setClasses(remaining);
            if (selectedClass && selectedClass._id === id) {
              setSelectedClass(remaining.length > 0 ? remaining[0] : null);
            }
          } else {
            toast.error(res.message || 'Failed to delete class');
          }
        } catch (err) {
          // Backend blocks deletion (returns 400) if sections exist
          toast.error(err.response?.data?.message || 'Error deleting class');
        }
      }
    });
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    const name = newSectionName.trim();
    if (!name || !selectedClass) return;
    const classId = selectedClass._id;
    try {
      const res = await createSection({ name, classId });
      if (res.success) {
        toast.success('Section created successfully');
        setNewSectionName('');
        setIsAddingSection(false);
        // Refresh sections
        const sectionsRes = await getSectionsByClass(classId);
        if (activeClassIdRef.current === classId && sectionsRes.success) {
          setSections(sectionsRes.data || []);
        }
      } else {
        toast.error(res.message || 'Failed to create section');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating section');
    }
  };

  const handleUpdateSection = async (id, newName) => {
    try {
      const res = await updateSection(id, { name: newName });
      if (res.success) {
        toast.success('Section updated successfully');
        setSections(prev => prev.map(s => s._id === id ? { ...s, name: newName } : s));
      } else {
        toast.error(res.message || 'Failed to update section');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating section');
    }
  };

  const handleDeleteSection = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Section',
      message: 'Are you sure you want to delete this section? This cannot be undone if no data depends on it.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteSection(id);
          if (res.success) {
            toast.success('Section deleted successfully');
            setSections(prev => prev.filter(s => s._id !== id));
          } else {
            toast.error(res.message || 'Failed to delete section');
          }
        } catch (err) {
          // Backend blocks deletion (returns 400) if students are assigned to the section
          toast.error(err.response?.data?.message || 'Error deleting section');
        }
      }
    });
  };

  // Subject Handlers
  const handleAddSubject = async (e) => {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name || !selectedClass) return;
    const classId = selectedClass._id;
    try {
      const res = await createSubject({ name, classId });
      if (res.success) {
        toast.success('Subject created successfully');
        setNewSubjectName('');
        setIsAddingSubject(false);
        // Refresh subjects
        const subjectsRes = await getSubjectsByClass(classId);
        if (activeClassIdRef.current === classId && subjectsRes.success) {
          setSubjects(subjectsRes.data || []);
        }
      } else {
        toast.error(res.message || 'Failed to create subject');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating subject');
    }
  };

  const handleUpdateSubject = async (id, newName) => {
    try {
      const res = await updateSubject(id, { name: newName });
      if (res.success) {
        toast.success('Subject updated successfully');
        setSubjects(prev => prev.map(s => s._id === id ? { ...s, name: newName } : s));
      } else {
        toast.error(res.message || 'Failed to update subject');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating subject');
    }
  };

  const handleDeleteSubject = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Subject',
      message: 'Are you sure you want to delete this subject? This cannot be undone if no data depends on it.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteSubject(id);
          if (res.success) {
            toast.success('Subject deleted successfully');
            setSubjects(prev => prev.filter(s => s._id !== id));
          } else {
            toast.error(res.message || 'Failed to delete subject');
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error deleting subject');
        }
      }
    });
  };

  return (
    <DashboardLayout navItems={navItems} subtitle="Administrative Suite">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Academic Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure Classes, Sections, and Subjects in one unified workstation.
          </p>
        </div>

        {/* 3-Column Workstation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* COLUMN 1: Classes */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col min-h-[480px]">
            {/* Column Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Classes</h3>
                <p className="text-xs text-gray-400 mt-0.5">Select a class to manage its structure</p>
              </div>
              <button
                onClick={() => setIsAddingClass(!isAddingClass)}
                className={`p-1.5 rounded-lg transition-colors border ${
                  isAddingClass
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-navy-900 text-white border-navy-900 hover:bg-navy-800'
                }`}
                title="Add Class"
              >
                <Plus className={`h-4 w-4 transition-transform duration-200 ${isAddingClass ? 'rotate-45' : ''}`} />
              </button>
            </div>

            {/* Inline Add Class Form */}
            {isAddingClass && (
              <form onSubmit={handleAddClass} className="mb-4 p-3 bg-slate-50 border border-gray-200/50 rounded-xl space-y-2 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Class Name (e.g. Grade 1)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white"
                  autoFocus
                />
                <select
                  value={newClassGender}
                  onChange={(e) => setNewClassGender(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white font-semibold text-gray-600"
                >
                  <option value="mixed">Mixed Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <div className="flex justify-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingClass(false);
                      setNewClassName('');
                      setNewClassGender('mixed');
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-navy-900 hover:bg-navy-800 rounded-md transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* Gender Filter Tabs */}
            <div className="flex border border-gray-200/50 bg-slate-50 p-0.5 rounded-lg mb-3">
              {['all', 'mixed', 'male', 'female'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setGenderFilter(tab)}
                  className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all capitalize ${
                    genderFilter === tab
                      ? 'bg-white text-navy-950 shadow-sm font-extrabold'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-2 flex-grow overflow-y-auto max-h-[350px] pr-1">
              {loadingClasses ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                  <span className="text-xs mt-2 font-medium">Loading classes...</span>
                </div>
              ) : classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-2xl p-4 bg-slate-50/50">
                  <BookOpen className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-700">No classes yet</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[160px]">
                    Create your first class to get started.
                  </p>
                </div>
              ) : classes.filter(cls => genderFilter === 'all' || cls.gender === genderFilter).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 rounded-2xl p-4 bg-slate-50/50">
                  <BookOpen className="h-6 w-6 text-gray-300 mb-1" />
                  <p className="text-[11px] font-bold text-gray-600">No classes match filter</p>
                </div>
              ) : (
                classes
                  .map((cls, index) => ({ cls, originalIndex: index }))
                  .filter(({ cls }) => genderFilter === 'all' || cls.gender === genderFilter)
                  .map(({ cls, originalIndex }) => {
                    const isSelected = selectedClass?._id === cls._id;
                    const dragOver = dragOverInfo?.type === 'class' && dragOverInfo?.index === originalIndex;
                    
                    return (
                      <div
                        key={cls._id}
                        draggable={true}
                        onDragStart={(_e) => {
                          dragSourceIndexRef.current = originalIndex;
                          dragTypeRef.current = 'class';
                        }}
                        onDragOver={(e) => handleDragOver(e, originalIndex, 'class')}
                        onDragEnd={handleDragEnd}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, originalIndex, 'class')}
                        onClick={() => setSelectedClass(cls)}
                        className={`group flex flex-col p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-navy-900/20 bg-navy-900/5 border-l-4 border-l-navy-900 shadow-sm font-semibold text-navy-900'
                            : 'border-gray-200/50 hover:bg-slate-50 text-gray-700'
                        } ${
                          dragOver ? 'border-t-2 border-t-navy-900 border-dashed pt-2.5' : ''
                        }`}
                      >
                        {editingClassId === cls._id ? (
                          <div className="flex flex-col space-y-2 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editClassNameValue}
                              onChange={(e) => setEditClassNameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateClass(cls._id, editClassNameValue, editClassGenderValue);
                                  setEditingClassId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingClassId(null);
                                }
                              }}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 bg-white"
                              placeholder="Class Name"
                              autoFocus
                            />
                            <select
                              value={editClassGenderValue}
                              onChange={(e) => setEditClassGenderValue(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 bg-white font-medium text-gray-600"
                            >
                              <option value="mixed">Mixed</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                            <div className="flex items-center space-x-1.5 justify-end">
                              <button
                                onClick={() => setEditingClassId(null)}
                                className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  handleUpdateClass(cls._id, editClassNameValue, editClassGenderValue);
                                  setEditingClassId(null);
                                }}
                                className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-navy-900 hover:bg-navy-800 rounded-md transition-colors shadow-sm"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center flex-grow truncate pr-2">
                              <GripVertical className="h-4 w-4 text-gray-400 mr-2 cursor-grab active:cursor-grabbing flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-800 mr-2">{formatClassName(cls.name)}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize tracking-wider ${
                                cls.gender === 'male'
                                  ? 'bg-sky-50 text-sky-600 border-sky-100/50'
                                  : cls.gender === 'female'
                                  ? 'bg-rose-50 text-rose-600 border-rose-100/50'
                                  : 'bg-slate-50 text-gray-500 border-gray-100'
                              }`}>
                                {cls.gender || 'mixed'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClassId(cls._id);
                                  setEditClassNameValue(cls.name);
                                  setEditClassGenderValue(cls.gender || 'mixed');
                                }}
                                className="p-1 text-gray-400 hover:text-navy-950 hover:bg-gray-100 rounded"
                                title="Edit Class"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClass(cls._id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete Class"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* COLUMN 2: Sections */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col min-h-[480px]">
            {!selectedClass ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 rounded-2xl border border-dashed border-gray-200">
                <Layers className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">No Class Selected</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                  Select a class from the left list to view and manage its sections.
                </p>
              </div>
            ) : (
              <>
                {/* Column Header */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base capitalize">
                      Sections in {formatClassNameWithGender(selectedClass.name, selectedClass.gender)}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Manage subdivisions of this class</p>
                  </div>
                  <button
                    onClick={() => setIsAddingSection(!isAddingSection)}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      isAddingSection
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        : 'bg-navy-900 text-white border-navy-900 hover:bg-navy-800'
                    }`}
                    title="Add Section"
                  >
                    <Plus className={`h-4 w-4 transition-transform duration-200 ${isAddingSection ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {/* Inline Add Section Form */}
                {isAddingSection && (
                  <form onSubmit={handleAddSection} className="mb-4 p-3 bg-slate-50 border border-gray-200/50 rounded-xl space-y-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Section Name (e.g. A)"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSection(false);
                          setNewSectionName('');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-navy-900 hover:bg-navy-800 rounded-md transition-colors shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {/* List */}
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[350px] pr-1">
                  {loadingSections ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                      <span className="text-xs mt-2 font-medium">Loading sections...</span>
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-2xl p-4 bg-slate-50/50">
                      <Layers className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs font-bold text-gray-700">No sections yet</p>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[160px]">
                        Add sections (like A, B, Gold, Silver) to this class.
                      </p>
                    </div>
                  ) : (
                    sections.map((sec, index) => (
                      <div
                        key={sec._id}
                        draggable={true}
                        onDragStart={(_e) => {
                          dragSourceIndexRef.current = index;
                          dragTypeRef.current = 'section';
                        }}
                        onDragOver={(e) => handleDragOver(e, index, 'section')}
                        onDragEnd={handleDragEnd}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index, 'section')}
                        className={`p-3.5 rounded-xl border transition-all duration-200 space-y-2 hover:bg-slate-50/50 cursor-pointer ${
                          dragOverInfo?.type === 'section' && dragOverInfo?.index === index
                            ? 'border-t-2 border-t-navy-900 border-dashed pt-2.5'
                            : 'border-gray-200/50'
                        }`}
                      >
                        {/* Top Row: Name and Edit/Delete Actions */}
                        <div className="flex items-center justify-between">
                          {editingSectionId === sec._id ? (
                            <div className="flex items-center space-x-2 w-full" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editSectionValue}
                                onChange={(e) => setEditSectionValue(e.target.value)}
                                className="flex-grow px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 bg-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateSection(sec._id, editSectionValue);
                                    setEditingSectionId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingSectionId(null);
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  handleUpdateSection(sec._id, editSectionValue);
                                  setEditingSectionId(null);
                                }}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSectionId(null)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center flex-grow truncate pr-2">
                                <GripVertical className="h-4 w-4 text-gray-400 mr-2 cursor-grab active:cursor-grabbing flex-shrink-0" />
                                <span className="text-sm font-semibold text-gray-700">Section {sec.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingSectionId(sec._id);
                                    setEditSectionValue(sec.name);
                                  }}
                                  className="p-1 text-gray-400 hover:text-navy-950 hover:bg-gray-100 rounded"
                                  title="Edit Section Name"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(sec._id)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete Section"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Bottom Row: Class Teacher Assignment */}
                        <div className="pt-1.5 border-t border-gray-100 text-xs flex flex-wrap items-center justify-between gap-2">
                          {assigningSectionId === sec._id ? (
                            <div className="flex items-center space-x-1.5 w-full">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssignTeacher(sec._id, e.target.value);
                                  }
                                }}
                                className="flex-grow bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-navy-800"
                                defaultValue=""
                              >
                                <option value="" disabled>Select Teacher...</option>
                                {teachers.map(t => (
                                  <option key={t._id} value={t._id}>
                                    {t.userId?.name} ({t.employeeId})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => setAssigningSectionId(null)}
                                className="px-2 py-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              {sec.classTeacherId ? (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[11px] text-gray-500 font-medium truncate max-w-[150px]">
                                    Class Teacher: <span className="text-navy-900 font-bold">{getTeacherName(sec.classTeacherId)}</span>
                                  </span>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <button
                                      onClick={() => setAssigningSectionId(sec._id)}
                                      className="text-[10px] text-navy-800 hover:text-navy-950 font-bold hover:underline"
                                    >
                                      Change
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                      onClick={() => handleUnassignTeacher(sec._id)}
                                      className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[11px] text-gray-400 italic font-medium">No Class Teacher assigned</span>
                                  <button
                                    onClick={() => setAssigningSectionId(sec._id)}
                                    className="text-[10px] text-navy-900 hover:text-navy-850 font-extrabold hover:underline flex items-center space-x-0.5"
                                  >
                                    <span>+ Assign</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* COLUMN 3: Subjects */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col min-h-[480px]">
            {!selectedClass ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 rounded-2xl border border-dashed border-gray-200">
                <BookMarked className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">No Class Selected</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                  Select a class from the left list to view and manage its subjects.
                </p>
              </div>
            ) : (
              <>
                {/* Column Header */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base capitalize">
                      Subjects in {formatClassNameWithGender(selectedClass.name, selectedClass.gender)}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Manage curriculum subjects</p>
                  </div>
                  <button
                    onClick={() => setIsAddingSubject(!isAddingSubject)}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      isAddingSubject
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        : 'bg-navy-900 text-white border-navy-900 hover:bg-navy-800'
                    }`}
                    title="Add Subject"
                  >
                    <Plus className={`h-4 w-4 transition-transform duration-200 ${isAddingSubject ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {/* Inline Add Subject Form */}
                {isAddingSubject && (
                  <form onSubmit={handleAddSubject} className="mb-4 p-3 bg-slate-50 border border-gray-200/50 rounded-xl space-y-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Subject Name (e.g. Mathematics)"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubject(false);
                          setNewSubjectName('');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-navy-900 hover:bg-navy-800 rounded-md transition-colors shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {/* List */}
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[350px] pr-1">
                  {loadingSubjects ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                      <span className="text-xs mt-2 font-medium">Loading subjects...</span>
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-2xl p-4 bg-slate-50/50">
                      <BookMarked className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs font-bold text-gray-700">No subjects yet</p>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[160px]">
                        Add subjects (like Math, English, Physics) to this class.
                      </p>
                    </div>
                  ) : (
                    subjects.map((sub, index) => (
                      <InlineEditableRow
                        key={sub._id}
                        label={sub.name}
                        onSave={(newName) => handleUpdateSubject(sub._id, newName)}
                        onDelete={() => handleDeleteSubject(sub._id)}
                        draggable={true}
                        onDragStart={(_e) => {
                          dragSourceIndexRef.current = index;
                          dragTypeRef.current = 'subject';
                        }}
                        onDragOver={(e) => handleDragOver(e, index, 'subject')}
                        onDragEnd={handleDragEnd}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index, 'subject')}
                        dragOver={dragOverInfo?.type === 'subject' && dragOverInfo?.index === index}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
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

export default AdminAcademics;
